use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde_json::{json, Map, Value};

use super::error::ApplicationError;
use crate::domain::ports::{BackupFiles, ChangeNotifier, Clock, RepositoryError, SnapshotStore};
use crate::domain::snapshot::{Row, Snapshot};

pub const FORMAT: &str = "self-planner-export";
pub const FORMAT_VERSION: i64 = 1;

/// Daily backups kept before the oldest is removed.
pub const KEEP_DAILY: usize = 14;
/// Safety copies taken right before an import or restore.
pub const KEEP_PRE_IMPORT: usize = 5;

const DAILY_PREFIX: &str = "backup-";
const PRE_IMPORT_PREFIX: &str = "pre-import-";

/// What an import brought in.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportSummary {
    pub rows: usize,
    /// Name of the safety copy of the data that was replaced.
    pub safety_backup: String,
}

/// Export, import, daily backups and rotation. Import replaces everything and is always
/// preceded by a safety copy of what it replaces.
pub struct BackupService {
    store: Arc<dyn SnapshotStore>,
    backups: Arc<dyn BackupFiles>,
    exports: Arc<dyn BackupFiles>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
}

impl BackupService {
    pub fn new(
        store: Arc<dyn SnapshotStore>,
        backups: Arc<dyn BackupFiles>,
        exports: Arc<dyn BackupFiles>,
        clock: Arc<dyn Clock>,
        notifier: Arc<dyn ChangeNotifier>,
    ) -> Self {
        Self {
            store,
            backups,
            exports,
            clock,
            notifier,
        }
    }

    /// Writes a full export to the exports folder and returns its location.
    pub fn export_to_file(&self) -> Result<String, ApplicationError> {
        let name = format!("self-planner-{}.json", stamp(self.clock.now()));
        self.exports.write(&name, &self.export_json()?)?;
        Ok(self.exports.location(&name)?)
    }

    pub fn export_json(&self) -> Result<String, ApplicationError> {
        let snapshot = self.store.export()?;
        Ok(to_json(&snapshot, self.clock.now()))
    }

    /// Takes today's backup unless it exists already, then trims old ones. Returns the name
    /// of a newly written file.
    pub fn ensure_daily_backup(&self) -> Result<Option<String>, ApplicationError> {
        let name = format!("{DAILY_PREFIX}{}.json", self.clock.now().format("%Y-%m-%d"));
        let created = if self.backups.exists(&name)? {
            None
        } else {
            self.backups.write(&name, &self.export_json()?)?;
            Some(name)
        };
        self.rotate()?;
        Ok(created)
    }

    /// Replaces all data with the contents of an export file.
    pub fn import_json(&self, text: &str) -> Result<ImportSummary, ApplicationError> {
        // Parse and check first: a bad file must not even cost a safety copy.
        let snapshot = from_json(text)?;
        let safety_backup = format!("{PRE_IMPORT_PREFIX}{}.json", stamp(self.clock.now()));
        self.backups.write(&safety_backup, &self.export_json()?)?;

        self.store.import(&snapshot)?;
        self.rotate()?;
        self.notifier.tasks_changed();
        self.notifier.timer_changed();
        Ok(ImportSummary {
            rows: snapshot.row_count(),
            safety_backup,
        })
    }

    pub fn list_backups(&self) -> Result<Vec<String>, ApplicationError> {
        let mut names = self.backups.list()?;
        names.reverse();
        Ok(names)
    }

    /// Replaces all data with a backup from the backups folder.
    pub fn restore_backup(&self, name: &str) -> Result<ImportSummary, ApplicationError> {
        if !(name.starts_with(DAILY_PREFIX) || name.starts_with(PRE_IMPORT_PREFIX)) {
            return Err(ApplicationError::Repository(RepositoryError::InvalidData(
                "not a backup file".into(),
            )));
        }
        let text = self.backups.read(name)?;
        self.import_json(&text)
    }

    fn rotate(&self) -> Result<(), ApplicationError> {
        let names = self.backups.list()?;
        for (prefix, keep) in [
            (DAILY_PREFIX, KEEP_DAILY),
            (PRE_IMPORT_PREFIX, KEEP_PRE_IMPORT),
        ] {
            // Names carry their date, so sorting by name sorts by age: oldest first.
            let mut group: Vec<&String> = names.iter().filter(|n| n.starts_with(prefix)).collect();
            group.sort();
            let excess = group.len().saturating_sub(keep);
            for name in group.into_iter().take(excess) {
                self.backups.delete(name)?;
            }
        }
        Ok(())
    }
}

fn stamp(now: DateTime<Utc>) -> String {
    now.format("%Y%m%d-%H%M%S").to_string()
}

fn to_json(snapshot: &Snapshot, exported_at: DateTime<Utc>) -> String {
    let tables: Map<String, Value> = snapshot
        .tables
        .iter()
        .map(|(name, rows)| {
            (
                name.clone(),
                Value::Array(rows.iter().cloned().map(Value::Object).collect()),
            )
        })
        .collect();
    let document = json!({
        "format": FORMAT,
        "version": FORMAT_VERSION,
        "schema": snapshot.schema_version,
        "exportedAt": exported_at.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        "tables": tables,
    });
    serde_json::to_string_pretty(&document).expect("a JSON value always serializes")
}

fn invalid(reason: &str) -> ApplicationError {
    ApplicationError::Repository(RepositoryError::InvalidData(reason.into()))
}

fn from_json(text: &str) -> Result<Snapshot, ApplicationError> {
    let document: Value = serde_json::from_str(text).map_err(|_| invalid("not JSON"))?;
    let object = document
        .as_object()
        .ok_or_else(|| invalid("not an object"))?;

    if object.get("format").and_then(Value::as_str) != Some(FORMAT) {
        return Err(invalid("not a Self Planner export"));
    }
    if object.get("version").and_then(Value::as_i64) != Some(FORMAT_VERSION) {
        return Err(invalid("unsupported export version"));
    }
    let schema_version = object
        .get("schema")
        .and_then(Value::as_i64)
        .filter(|version| *version >= 1)
        .ok_or_else(|| invalid("missing schema version"))?;
    let tables_value = object
        .get("tables")
        .and_then(Value::as_object)
        .ok_or_else(|| invalid("missing tables"))?;

    let mut tables = std::collections::BTreeMap::new();
    for (name, rows) in tables_value {
        if !Snapshot::is_known_table(name) {
            return Err(invalid("unknown table"));
        }
        let rows = rows
            .as_array()
            .ok_or_else(|| invalid("table is not a list"))?;
        let parsed: Result<Vec<Row>, ApplicationError> = rows
            .iter()
            .map(|row| {
                row.as_object()
                    .cloned()
                    .ok_or_else(|| invalid("row is not an object"))
            })
            .collect();
        tables.insert(name.clone(), parsed?);
    }

    Ok(Snapshot {
        schema_version,
        tables,
    })
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::sync::Mutex;

    use super::*;
    use crate::application::test_support::{CountingNotifier, ManualClock};
    use crate::domain::snapshot::TABLE_ORDER;

    #[derive(Default)]
    struct MemoryFiles(Mutex<BTreeMap<String, String>>);

    impl BackupFiles for MemoryFiles {
        fn write(&self, name: &str, content: &str) -> Result<(), RepositoryError> {
            self.0.lock().unwrap().insert(name.into(), content.into());
            Ok(())
        }
        fn read(&self, name: &str) -> Result<String, RepositoryError> {
            self.0
                .lock()
                .unwrap()
                .get(name)
                .cloned()
                .ok_or_else(|| RepositoryError::Storage("missing".into()))
        }
        fn exists(&self, name: &str) -> Result<bool, RepositoryError> {
            Ok(self.0.lock().unwrap().contains_key(name))
        }
        fn list(&self) -> Result<Vec<String>, RepositoryError> {
            Ok(self.0.lock().unwrap().keys().cloned().collect())
        }
        fn delete(&self, name: &str) -> Result<(), RepositoryError> {
            self.0.lock().unwrap().remove(name);
            Ok(())
        }
        fn location(&self, name: &str) -> Result<String, RepositoryError> {
            Ok(format!("/memory/{name}"))
        }
    }

    /// Holds one snapshot in memory; `fail_import` simulates a store that rejects the data.
    struct MemoryStore {
        current: Mutex<Snapshot>,
        fail_import: bool,
    }

    impl MemoryStore {
        fn with_tasks(titles: &[&str]) -> Self {
            let mut tables = BTreeMap::new();
            for table in TABLE_ORDER {
                tables.insert(table.to_string(), Vec::new());
            }
            tables.insert(
                "tasks".into(),
                titles
                    .iter()
                    .map(|title| {
                        json!({"id": title, "title": title})
                            .as_object()
                            .unwrap()
                            .clone()
                    })
                    .collect(),
            );
            Self {
                current: Mutex::new(Snapshot {
                    schema_version: 7,
                    tables,
                }),
                fail_import: false,
            }
        }
    }

    impl SnapshotStore for MemoryStore {
        fn export(&self) -> Result<Snapshot, RepositoryError> {
            Ok(self.current.lock().unwrap().clone())
        }
        fn import(&self, snapshot: &Snapshot) -> Result<(), RepositoryError> {
            if self.fail_import {
                return Err(RepositoryError::InvalidData("rejected".into()));
            }
            *self.current.lock().unwrap() = snapshot.clone();
            Ok(())
        }
    }

    struct Fixture {
        service: BackupService,
        store: Arc<MemoryStore>,
        backups: Arc<MemoryFiles>,
        exports: Arc<MemoryFiles>,
        clock: Arc<ManualClock>,
        notifier: Arc<CountingNotifier>,
    }

    fn fixture_with(store: MemoryStore) -> Fixture {
        let store = Arc::new(store);
        let backups = Arc::new(MemoryFiles::default());
        let exports = Arc::new(MemoryFiles::default());
        let clock = Arc::new(ManualClock::default());
        let notifier = Arc::new(CountingNotifier::default());
        let service = BackupService::new(
            store.clone(),
            backups.clone(),
            exports.clone(),
            clock.clone(),
            notifier.clone(),
        );
        Fixture {
            service,
            store,
            backups,
            exports,
            clock,
            notifier,
        }
    }

    fn fixture() -> Fixture {
        fixture_with(MemoryStore::with_tasks(&["a", "b"]))
    }

    fn titles(store: &MemoryStore) -> Vec<String> {
        store.current.lock().unwrap().tables["tasks"]
            .iter()
            .map(|row| row["title"].as_str().unwrap().to_string())
            .collect()
    }

    #[test]
    fn export_then_import_round_trips_through_the_file_format() {
        let source = fixture();
        let text = source.service.export_json().unwrap();

        let target = fixture_with(MemoryStore::with_tasks(&["old"]));
        let summary = target.service.import_json(&text).unwrap();

        assert_eq!(titles(&target.store), vec!["a", "b"]);
        assert_eq!(summary.rows, 2);
    }

    #[test]
    fn export_file_is_written_to_the_exports_folder() {
        let f = fixture();
        let location = f.service.export_to_file().unwrap();
        assert!(location.starts_with("/memory/self-planner-"));
        let names = f.exports.list().unwrap();
        assert_eq!(names.len(), 1);
        assert!(f
            .exports
            .read(&names[0])
            .unwrap()
            .contains("self-planner-export"));
    }

    #[test]
    fn import_takes_a_safety_copy_of_what_it_replaces_and_notifies() {
        let f = fixture();
        let text = fixture_with(MemoryStore::with_tasks(&["new"]))
            .service
            .export_json()
            .unwrap();

        let summary = f.service.import_json(&text).unwrap();

        assert_eq!(titles(&f.store), vec!["new"]);
        let safety = f.backups.read(&summary.safety_backup).unwrap();
        assert!(safety.contains("\"a\"") && safety.contains("\"b\""));
        assert_eq!(f.notifier.count(), 1);
        assert_eq!(
            f.notifier
                .timer_count
                .load(std::sync::atomic::Ordering::SeqCst),
            1
        );
    }

    #[test]
    fn a_bad_file_changes_nothing_and_costs_no_safety_copy() {
        let f = fixture();
        let bad = [
            "not json",
            "[]",
            "{}",
            r#"{"format":"other","version":1,"schema":7,"tables":{}}"#,
            r#"{"format":"self-planner-export","version":2,"schema":7,"tables":{}}"#,
            r#"{"format":"self-planner-export","version":1,"tables":{}}"#,
            r#"{"format":"self-planner-export","version":1,"schema":7,"tables":{"sqlite_master":[]}}"#,
            r#"{"format":"self-planner-export","version":1,"schema":7,"tables":{"tasks":[1]}}"#,
            r#"{"format":"self-planner-export","version":1,"schema":7,"tables":{"tasks":{}}}"#,
        ];
        for text in bad {
            assert!(
                matches!(
                    f.service.import_json(text),
                    Err(ApplicationError::Repository(RepositoryError::InvalidData(
                        _
                    )))
                ),
                "{text}"
            );
        }
        assert_eq!(titles(&f.store), vec!["a", "b"]);
        assert!(f.backups.list().unwrap().is_empty());
        assert_eq!(f.notifier.count(), 0);
    }

    #[test]
    fn a_store_that_rejects_the_data_leaves_the_safety_copy_and_no_notification() {
        let mut store = MemoryStore::with_tasks(&["a"]);
        store.fail_import = true;
        let f = fixture_with(store);
        let text = fixture().service.export_json().unwrap();

        assert!(f.service.import_json(&text).is_err());
        assert_eq!(titles(&f.store), vec!["a"]);
        assert_eq!(f.backups.list().unwrap().len(), 1);
        assert_eq!(f.notifier.count(), 0);
    }

    #[test]
    fn daily_backup_is_taken_once_per_day() {
        let f = fixture();
        let first = f.service.ensure_daily_backup().unwrap();
        assert_eq!(first.as_deref(), Some("backup-2026-10-15.json"));
        assert_eq!(f.service.ensure_daily_backup().unwrap(), None);
        assert_eq!(f.backups.list().unwrap().len(), 1);

        f.clock.advance(24 * 3600);
        assert_eq!(
            f.service.ensure_daily_backup().unwrap().as_deref(),
            Some("backup-2026-10-16.json")
        );
        assert_eq!(f.backups.list().unwrap().len(), 2);
    }

    #[test]
    fn rotation_keeps_the_newest_fourteen_daily_backups() {
        let f = fixture();
        for _ in 0..(KEEP_DAILY + 6) {
            f.service.ensure_daily_backup().unwrap();
            f.clock.advance(24 * 3600);
        }
        let names = f.backups.list().unwrap();
        assert_eq!(names.len(), KEEP_DAILY);
        assert_eq!(names.first().unwrap(), "backup-2026-10-21.json");
        assert_eq!(names.last().unwrap(), "backup-2026-11-03.json");
    }

    #[test]
    fn rotation_trims_safety_copies_separately_from_daily_ones() {
        let f = fixture();
        f.service.ensure_daily_backup().unwrap();
        let text = f.service.export_json().unwrap();
        for _ in 0..(KEEP_PRE_IMPORT + 3) {
            f.clock.advance(60);
            f.service.import_json(&text).unwrap();
        }
        let names = f.backups.list().unwrap();
        let safety = names
            .iter()
            .filter(|n| n.starts_with("pre-import-"))
            .count();
        let daily = names.iter().filter(|n| n.starts_with("backup-")).count();
        assert_eq!(safety, KEEP_PRE_IMPORT);
        assert_eq!(daily, 1);
    }

    #[test]
    fn restore_loads_a_backup_newest_first_list_and_refuses_other_names() {
        let f = fixture();
        f.service.ensure_daily_backup().unwrap();
        f.clock.advance(24 * 3600);
        f.service.ensure_daily_backup().unwrap();
        assert_eq!(
            f.service.list_backups().unwrap(),
            vec!["backup-2026-10-16.json", "backup-2026-10-15.json"]
        );

        f.store
            .current
            .lock()
            .unwrap()
            .tables
            .get_mut("tasks")
            .unwrap()
            .clear();
        f.service.restore_backup("backup-2026-10-15.json").unwrap();
        assert_eq!(titles(&f.store), vec!["a", "b"]);

        assert!(f.service.restore_backup("self-planner-x.json").is_err());
    }
}
