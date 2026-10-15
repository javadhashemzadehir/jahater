use std::collections::BTreeMap;

use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params_from_iter, Connection};
use serde_json::{Number, Value};

use crate::domain::ports::{RepositoryError, SnapshotStore};
use crate::domain::snapshot::{Row, Snapshot, TABLE_ORDER};
use crate::infrastructure::database::SharedConnection;

/// Reads and replaces the whole database as JSON rows. All of an import happens in one
/// transaction: if any row is rejected, nothing changes.
pub struct SqliteSnapshotStore {
    connection: SharedConnection,
}

impl SqliteSnapshotStore {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }
}

impl SnapshotStore for SqliteSnapshotStore {
    fn export(&self) -> Result<Snapshot, RepositoryError> {
        let connection = self.lock()?;
        let mut tables = BTreeMap::new();
        for table in TABLE_ORDER {
            tables.insert(table.to_string(), read_table(&connection, table)?);
        }
        Ok(Snapshot {
            schema_version: schema_version(&connection)?,
            tables,
        })
    }

    fn import(&self, snapshot: &Snapshot) -> Result<(), RepositoryError> {
        let mut connection = self.lock()?;
        if snapshot.schema_version > schema_version(&connection)? {
            return Err(RepositoryError::InvalidData(
                "export is from a newer version of the app".into(),
            ));
        }

        let transaction = connection.transaction().map_err(storage)?;
        for table in TABLE_ORDER.iter().rev() {
            transaction
                .execute(&format!("DELETE FROM {table}"), [])
                .map_err(storage)?;
        }
        for table in TABLE_ORDER {
            let rows = snapshot.tables.get(table).map(Vec::as_slice).unwrap_or(&[]);
            let columns = column_names(&transaction, table)?;
            for row in rows {
                insert_row(&transaction, table, &columns, row)?;
            }
        }
        transaction.commit().map_err(storage)
    }
}

impl SqliteSnapshotStore {
    fn lock(&self) -> Result<std::sync::MutexGuard<'_, Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

fn schema_version(connection: &Connection) -> Result<i64, RepositoryError> {
    connection
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM refinery_schema_history",
            [],
            |row| row.get(0),
        )
        .map_err(storage)
}

fn column_names(connection: &Connection, table: &str) -> Result<Vec<String>, RepositoryError> {
    // `table` is always one of TABLE_ORDER, never user input.
    let mut statement = connection
        .prepare(&format!("SELECT name FROM pragma_table_info('{table}')"))
        .map_err(storage)?;
    let names = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(storage)?;
    names.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn read_table(connection: &Connection, table: &str) -> Result<Vec<Row>, RepositoryError> {
    let mut statement = connection
        .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
        .map_err(storage)?;
    let names: Vec<String> = statement
        .column_names()
        .iter()
        .map(|name| name.to_string())
        .collect();

    let mut rows = statement.query([]).map_err(storage)?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().map_err(storage)? {
        let mut object = Row::new();
        for (index, name) in names.iter().enumerate() {
            let value = match row.get_ref(index).map_err(storage)? {
                ValueRef::Null => Value::Null,
                ValueRef::Integer(number) => Value::from(number),
                ValueRef::Real(number) => {
                    Number::from_f64(number).map_or(Value::Null, Value::Number)
                }
                ValueRef::Text(bytes) => Value::String(
                    String::from_utf8(bytes.to_vec())
                        .map_err(|_| RepositoryError::Storage("text is not UTF-8".into()))?,
                ),
                ValueRef::Blob(_) => {
                    return Err(RepositoryError::Storage("unexpected binary column".into()))
                }
            };
            object.insert(name.clone(), value);
        }
        out.push(object);
    }
    Ok(out)
}

fn insert_row(
    connection: &Connection,
    table: &str,
    columns: &[String],
    row: &Row,
) -> Result<(), RepositoryError> {
    if row.is_empty() {
        return Err(RepositoryError::InvalidData(format!(
            "empty row in {table}"
        )));
    }
    // Only columns the table really has may appear, so a key can never carry SQL.
    let mut names = Vec::new();
    let mut values = Vec::new();
    for (name, value) in row {
        if !columns.iter().any(|column| column == name) {
            return Err(RepositoryError::InvalidData(format!(
                "unknown column {name} in {table}"
            )));
        }
        names.push(name.as_str());
        values.push(to_sql(value, table, name)?);
    }

    let placeholders = (1..=names.len())
        .map(|n| format!("?{n}"))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "INSERT INTO {table} ({}) VALUES ({placeholders})",
        names.join(", ")
    );
    connection
        .execute(&sql, params_from_iter(values.iter()))
        .map_err(|error| RepositoryError::InvalidData(format!("{table}: {error}")))?;
    Ok(())
}

fn to_sql(value: &Value, table: &str, column: &str) -> Result<SqlValue, RepositoryError> {
    match value {
        Value::Null => Ok(SqlValue::Null),
        Value::Bool(flag) => Ok(SqlValue::Integer(i64::from(*flag))),
        Value::Number(number) => number
            .as_i64()
            .map(SqlValue::Integer)
            .or_else(|| number.as_f64().map(SqlValue::Real))
            .ok_or_else(|| RepositoryError::InvalidData(format!("{table}.{column}: bad number"))),
        Value::String(text) => Ok(SqlValue::Text(text.clone())),
        _ => Err(RepositoryError::InvalidData(format!(
            "{table}.{column}: nested value"
        ))),
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use serde_json::json;

    use super::*;
    use crate::domain::label::{Label, LabelKind};
    use crate::domain::ports::{LabelRepository, TaskRepository};
    use crate::domain::task::{NewTask, Task};
    use crate::infrastructure::database;
    use crate::infrastructure::repositories::sqlite_label_repository::SqliteLabelRepository;
    use crate::infrastructure::repositories::sqlite_task_repository::SqliteTaskRepository;

    struct Db {
        store: SqliteSnapshotStore,
        tasks: SqliteTaskRepository,
        labels: SqliteLabelRepository,
    }

    fn db() -> Db {
        let connection = database::share(database::open_in_memory().unwrap());
        Db {
            store: SqliteSnapshotStore::new(connection.clone()),
            tasks: SqliteTaskRepository::new(connection.clone()),
            labels: SqliteLabelRepository::new(connection),
        }
    }

    fn seed(db: &Db) {
        let now = Utc::now();
        db.labels
            .insert(
                LabelKind::Project,
                &Label::new("p1".into(), "Thesis", now).unwrap(),
            )
            .unwrap();
        db.labels
            .insert(
                LabelKind::Tag,
                &Label::new("t1".into(), "home", now).unwrap(),
            )
            .unwrap();
        let mut task = Task::new(
            "a".into(),
            NewTask {
                title: "Write".into(),
                notes: Some("draft".into()),
                estimate_minutes: Some(45),
                is_urgent: true,
                ..Default::default()
            },
            now,
        )
        .unwrap();
        task.project_id = Some("p1".into());
        task.tag_ids = vec!["t1".into()];
        db.tasks.insert(&task).unwrap();

        // A trashed task must survive an export too.
        let mut trashed = Task::new(
            "b".into(),
            NewTask {
                title: "Old".into(),
                ..Default::default()
            },
            now,
        )
        .unwrap();
        trashed.trash(now);
        db.tasks.insert(&trashed).unwrap();
    }

    #[test]
    fn export_includes_every_table_and_soft_deleted_rows() {
        let db = db();
        seed(&db);
        let snapshot = db.store.export().unwrap();

        assert_eq!(snapshot.tables.len(), TABLE_ORDER.len());
        assert_eq!(snapshot.tables["tasks"].len(), 2);
        assert_eq!(snapshot.tables["task_tags"].len(), 1);
        assert_eq!(snapshot.tables["projects"][0]["name"], json!("Thesis"));
        assert!(snapshot.schema_version >= 7);
    }

    #[test]
    fn exporting_into_a_fresh_database_restores_everything() {
        let source = db();
        seed(&source);
        let snapshot = source.store.export().unwrap();

        let target = db();
        target.store.import(&snapshot).unwrap();

        assert_eq!(target.store.export().unwrap(), snapshot);
        let task = target.tasks.find_active("a").unwrap().unwrap();
        assert_eq!(task.tag_ids, vec!["t1"]);
        assert_eq!(task.project_id.as_deref(), Some("p1"));
        assert!(target.tasks.find_trashed("b").unwrap().is_some());
    }

    #[test]
    fn import_replaces_existing_data() {
        let source = db();
        seed(&source);
        let snapshot = source.store.export().unwrap();

        let target = db();
        let now = Utc::now();
        target
            .tasks
            .insert(
                &Task::new(
                    "keep-me-not".into(),
                    NewTask {
                        title: "Gone after import".into(),
                        ..Default::default()
                    },
                    now,
                )
                .unwrap(),
            )
            .unwrap();
        target.store.import(&snapshot).unwrap();

        assert!(target.tasks.find_active("keep-me-not").unwrap().is_none());
        assert!(target.tasks.find_active("a").unwrap().is_some());
    }

    #[test]
    fn a_rejected_row_rolls_the_whole_import_back() {
        let target = db();
        seed(&target);
        let before = target.store.export().unwrap();

        let mut broken = before.clone();
        // A task pointing at a project that is not in the file breaks a foreign key.
        broken.tables.get_mut("tasks").unwrap()[0].insert("project_id".into(), json!("nope"));
        let result = target.store.import(&broken);

        assert!(matches!(result, Err(RepositoryError::InvalidData(_))));
        assert_eq!(target.store.export().unwrap(), before);
    }

    #[test]
    fn unknown_columns_and_unknown_tables_never_reach_sql() {
        let target = db();
        let mut snapshot = target.store.export().unwrap();
        snapshot.tables.get_mut("tags").unwrap().push(
            json!({"id": "x", "name": "n", "revision": 1, "created_at": "a", "updated_at": "b", "evil); DROP TABLE tasks;--": 1})
                .as_object()
                .unwrap()
                .clone(),
        );
        assert!(matches!(
            target.store.import(&snapshot),
            Err(RepositoryError::InvalidData(_))
        ));
        assert!(target.tasks.list_active().is_ok());
    }

    #[test]
    fn an_export_from_a_newer_schema_is_refused() {
        let target = db();
        let mut snapshot = target.store.export().unwrap();
        snapshot.schema_version += 1;
        assert!(matches!(
            target.store.import(&snapshot),
            Err(RepositoryError::InvalidData(_))
        ));
    }

    #[test]
    fn rows_written_by_an_older_schema_import_with_defaults() {
        let target = db();
        let mut snapshot = target.store.export().unwrap();
        snapshot.schema_version = 1;
        // An old task row has no notes, estimate, project or tags.
        snapshot.tables.get_mut("tasks").unwrap().push(
            json!({
                "id": "old", "title": "From v1", "status": "todo", "is_urgent": 0, "is_important": 0,
                "deleted_at": null, "revision": 1,
                "created_at": "2026-10-01T08:00:00.000Z", "updated_at": "2026-10-01T08:00:00.000Z"
            })
            .as_object()
            .unwrap()
            .clone(),
        );
        target.store.import(&snapshot).unwrap();
        let task = target.tasks.find_active("old").unwrap().unwrap();
        assert_eq!(task.notes, None);
        assert!(task.tag_ids.is_empty());
    }
}
