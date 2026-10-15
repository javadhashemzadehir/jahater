use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};

use super::mappers::task_row::{format_timestamp, task_from_row};
use super::queries::tasks::{
    DELETE_TASK_TAGS, FIND_ACTIVE_TASK, FIND_TRASHED_TASK, INSERT_TASK, INSERT_TASK_TAG,
    PURGE_TASK, SELECT_ACTIVE_TASKS, SELECT_ALL_TASK_TAGS, SELECT_TASK_TAGS, SELECT_TRASHED_TASKS,
    UPDATE_TASK,
};
use crate::domain::ports::{RepositoryError, TaskRepository};
use crate::domain::task::Task;
use crate::infrastructure::database::SharedConnection;

pub struct SqliteTaskRepository {
    connection: SharedConnection,
}

impl SqliteTaskRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }
}

impl TaskRepository for SqliteTaskRepository {
    fn insert(&self, task: &Task) -> Result<(), RepositoryError> {
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(storage)?;
        transaction
            .execute(
                INSERT_TASK,
                params![
                    task.id,
                    task.title,
                    task.notes,
                    task.status.as_str(),
                    task.is_urgent,
                    task.is_important,
                    task.estimate_minutes,
                    task.deleted_at.map(format_timestamp),
                    task.revision,
                    format_timestamp(task.created_at),
                    format_timestamp(task.updated_at),
                    task.project_id,
                ],
            )
            .map_err(storage)?;
        write_tags(&transaction, task)?;
        transaction.commit().map_err(storage)
    }

    fn update(&self, task: &Task) -> Result<(), RepositoryError> {
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(storage)?;
        transaction
            .execute(
                UPDATE_TASK,
                params![
                    task.id,
                    task.title,
                    task.notes,
                    task.status.as_str(),
                    task.is_urgent,
                    task.is_important,
                    task.estimate_minutes,
                    task.deleted_at.map(format_timestamp),
                    task.revision,
                    format_timestamp(task.updated_at),
                    task.project_id,
                ],
            )
            .map_err(storage)?;
        transaction
            .execute(DELETE_TASK_TAGS, params![task.id])
            .map_err(storage)?;
        write_tags(&transaction, task)?;
        transaction.commit().map_err(storage)
    }

    fn purge(&self, id: &str) -> Result<bool, RepositoryError> {
        let removed = self
            .connection()?
            .execute(PURGE_TASK, params![id])
            .map_err(storage)?;
        Ok(removed > 0)
    }

    fn find_active(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
        self.find_one(FIND_ACTIVE_TASK, id)
    }

    fn find_trashed(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
        self.find_one(FIND_TRASHED_TASK, id)
    }

    fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
        self.list(SELECT_ACTIVE_TASKS)
    }

    fn list_trashed(&self) -> Result<Vec<Task>, RepositoryError> {
        self.list(SELECT_TRASHED_TASKS)
    }
}

impl SqliteTaskRepository {
    fn connection(&self) -> Result<std::sync::MutexGuard<'_, Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }

    fn find_one(&self, sql: &str, id: &str) -> Result<Option<Task>, RepositoryError> {
        let connection = self.connection()?;
        let task = connection
            .query_row(sql, params![id], task_from_row)
            .optional()
            .map_err(storage)?;
        let Some(mut task) = task else {
            return Ok(None);
        };
        let mut statement = connection.prepare(SELECT_TASK_TAGS).map_err(storage)?;
        task.tag_ids = statement
            .query_map(params![task.id], |row| row.get::<_, String>(0))
            .map_err(storage)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(storage)?;
        Ok(Some(task))
    }

    fn list(&self, sql: &str) -> Result<Vec<Task>, RepositoryError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(sql).map_err(storage)?;
        let mut tasks = statement
            .query_map([], task_from_row)
            .map_err(storage)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(storage)?;

        let mut statement = connection.prepare(SELECT_ALL_TASK_TAGS).map_err(storage)?;
        let mut tags: HashMap<String, Vec<String>> = HashMap::new();
        let pairs = statement
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(storage)?;
        for pair in pairs {
            let (task_id, tag_id) = pair.map_err(storage)?;
            tags.entry(task_id).or_default().push(tag_id);
        }
        for task in &mut tasks {
            task.tag_ids = tags.remove(&task.id).unwrap_or_default();
        }
        Ok(tasks)
    }
}

fn write_tags(transaction: &rusqlite::Transaction<'_>, task: &Task) -> Result<(), RepositoryError> {
    for tag_id in &task.tag_ids {
        transaction
            .execute(INSERT_TASK_TAG, params![task.id, tag_id])
            .map_err(storage)?;
    }
    Ok(())
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::label::{Label, LabelKind};
    use crate::domain::ports::LabelRepository;
    use crate::domain::task::NewTask;
    use crate::infrastructure::database;
    use crate::infrastructure::repositories::sqlite_label_repository::SqliteLabelRepository;

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn task(id: &str, title: &str, created: &str) -> Task {
        Task::new(
            id.into(),
            NewTask {
                title: title.into(),
                notes: Some("note".into()),
                estimate_minutes: Some(45),
                ..Default::default()
            },
            at(created),
        )
        .unwrap()
    }

    fn repositories() -> (SqliteTaskRepository, SqliteLabelRepository) {
        let connection = database::share(database::open_in_memory().unwrap());
        (
            SqliteTaskRepository::new(connection.clone()),
            SqliteLabelRepository::new(connection),
        )
    }

    fn repository() -> SqliteTaskRepository {
        repositories().0
    }

    #[test]
    fn inserted_task_reads_back_with_the_same_fields() {
        let repository = repository();
        let saved = task("id-1", "Buy milk", "2026-10-15T08:00:00.250Z");

        repository.insert(&saved).unwrap();

        assert_eq!(repository.list_active().unwrap(), vec![saved]);
    }

    #[test]
    fn update_writes_every_mutable_field() {
        let repository = repository();
        let mut saved = task("id-1", "Buy milk", "2026-10-15T08:00:00Z");
        repository.insert(&saved).unwrap();

        saved.is_urgent = true;
        saved.estimate_minutes = None;
        saved.revision = 2;
        saved.updated_at = at("2026-10-15T09:00:00Z");
        repository.update(&saved).unwrap();

        assert_eq!(repository.find_active("id-1").unwrap(), Some(saved));
    }

    #[test]
    fn project_and_tags_round_trip_and_can_be_replaced() {
        let (tasks, labels) = repositories();
        let now = at("2026-10-15T08:00:00Z");
        labels
            .insert(
                LabelKind::Project,
                &Label::new("p1".into(), "Thesis", now).unwrap(),
            )
            .unwrap();
        for (id, name) in [("t1", "home"), ("t2", "calls")] {
            labels
                .insert(LabelKind::Tag, &Label::new(id.into(), name, now).unwrap())
                .unwrap();
        }

        let mut saved = task("id-1", "Write", "2026-10-15T08:00:00Z");
        saved.project_id = Some("p1".into());
        saved.tag_ids = vec!["t1".into(), "t2".into()];
        tasks.insert(&saved).unwrap();
        assert_eq!(tasks.find_active("id-1").unwrap(), Some(saved.clone()));
        assert_eq!(tasks.list_active().unwrap(), vec![saved.clone()]);

        saved.tag_ids = vec!["t2".into()];
        saved.project_id = None;
        saved.revision = 2;
        tasks.update(&saved).unwrap();
        assert_eq!(tasks.find_active("id-1").unwrap(), Some(saved));
    }

    #[test]
    fn deleting_a_label_keeps_the_task_and_unlinks_it() {
        let (tasks, labels) = repositories();
        let now = at("2026-10-15T08:00:00Z");
        labels
            .insert(
                LabelKind::Project,
                &Label::new("p1".into(), "Thesis", now).unwrap(),
            )
            .unwrap();
        labels
            .insert(
                LabelKind::Tag,
                &Label::new("t1".into(), "home", now).unwrap(),
            )
            .unwrap();
        let mut saved = task("id-1", "Write", "2026-10-15T08:00:00Z");
        saved.project_id = Some("p1".into());
        saved.tag_ids = vec!["t1".into()];
        tasks.insert(&saved).unwrap();

        labels.delete(LabelKind::Project, "p1").unwrap();
        labels.delete(LabelKind::Tag, "t1").unwrap();

        let found = tasks.find_active("id-1").unwrap().unwrap();
        assert_eq!(found.project_id, None);
        assert!(found.tag_ids.is_empty());
    }

    #[test]
    fn unknown_project_is_rejected_by_the_database() {
        let repository = repository();
        let mut saved = task("id-1", "Write", "2026-10-15T08:00:00Z");
        saved.project_id = Some("missing".into());
        assert!(repository.insert(&saved).is_err());
        assert!(repository.list_active().unwrap().is_empty());
    }

    #[test]
    fn trashed_tasks_are_listed_only_in_trash() {
        let repository = repository();
        let mut saved = task("id-1", "Buy milk", "2026-10-15T08:00:00Z");
        repository.insert(&saved).unwrap();

        saved.trash(at("2026-10-15T09:00:00Z"));
        repository.update(&saved).unwrap();

        assert!(repository.list_active().unwrap().is_empty());
        assert!(repository.find_active("id-1").unwrap().is_none());
        assert_eq!(repository.list_trashed().unwrap(), vec![saved.clone()]);
        assert_eq!(repository.find_trashed("id-1").unwrap(), Some(saved));
    }

    #[test]
    fn purge_removes_only_trashed_rows() {
        let repository = repository();
        let mut saved = task("id-1", "Buy milk", "2026-10-15T08:00:00Z");
        repository.insert(&saved).unwrap();

        assert!(!repository.purge("id-1").unwrap());

        saved.trash(at("2026-10-15T09:00:00Z"));
        repository.update(&saved).unwrap();
        assert!(repository.purge("id-1").unwrap());
        assert!(repository.list_trashed().unwrap().is_empty());
    }

    #[test]
    fn list_orders_newest_first() {
        let repository = repository();
        repository
            .insert(&task("a", "Older", "2026-10-14T08:00:00Z"))
            .unwrap();
        repository
            .insert(&task("b", "Newer", "2026-10-15T08:00:00Z"))
            .unwrap();

        let titles: Vec<String> = repository
            .list_active()
            .unwrap()
            .into_iter()
            .map(|t| t.title)
            .collect();

        assert_eq!(titles, vec!["Newer", "Older"]);
    }
}
