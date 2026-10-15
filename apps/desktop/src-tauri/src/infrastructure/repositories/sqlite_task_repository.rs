use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};

use super::mappers::task_row::{format_timestamp, task_from_row};
use super::queries::tasks::{
    FIND_ACTIVE_TASK, FIND_TRASHED_TASK, INSERT_TASK, PURGE_TASK, SELECT_ACTIVE_TASKS,
    SELECT_TRASHED_TASKS, UPDATE_TASK,
};
use crate::domain::ports::{RepositoryError, TaskRepository};
use crate::domain::task::Task;

pub struct SqliteTaskRepository {
    connection: Mutex<Connection>,
}

impl SqliteTaskRepository {
    pub fn new(connection: Connection) -> Self {
        Self {
            connection: Mutex::new(connection),
        }
    }
}

impl TaskRepository for SqliteTaskRepository {
    fn insert(&self, task: &Task) -> Result<(), RepositoryError> {
        self.connection()?
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
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn update(&self, task: &Task) -> Result<(), RepositoryError> {
        self.connection()?
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
                ],
            )
            .map_err(storage)?;
        Ok(())
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
        self.connection()?
            .query_row(sql, params![id], task_from_row)
            .optional()
            .map_err(storage)
    }

    fn list(&self, sql: &str) -> Result<Vec<Task>, RepositoryError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(sql).map_err(storage)?;
        let rows = statement.query_map([], task_from_row).map_err(storage)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage)
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::task::NewTask;
    use crate::infrastructure::database;

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

    fn repository() -> SqliteTaskRepository {
        SqliteTaskRepository::new(database::open_in_memory().unwrap())
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
