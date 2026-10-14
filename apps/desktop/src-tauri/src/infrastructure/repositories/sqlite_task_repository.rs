use std::sync::Mutex;

use rusqlite::{params, Connection};

use super::mappers::task_row::{format_timestamp, task_from_row};
use super::queries::tasks::{INSERT_TASK, SELECT_ACTIVE_TASKS};
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
        let connection = self.connection()?;
        connection
            .execute(
                INSERT_TASK,
                params![
                    task.id,
                    task.title,
                    task.status.as_str(),
                    task.is_urgent,
                    task.is_important,
                    task.revision,
                    format_timestamp(task.created_at),
                    format_timestamp(task.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
        let connection = self.connection()?;
        let mut statement = connection.prepare(SELECT_ACTIVE_TASKS).map_err(storage)?;
        let rows = statement.query_map([], task_from_row).map_err(storage)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage)
    }
}

impl SqliteTaskRepository {
    fn connection(&self) -> Result<std::sync::MutexGuard<'_, Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::infrastructure::database;

    fn task(id: &str, title: &str, at: &str) -> Task {
        let at = DateTime::parse_from_rfc3339(at)
            .unwrap()
            .with_timezone(&Utc);
        Task::new(id.into(), title, at).unwrap()
    }

    #[test]
    fn inserted_task_reads_back_with_the_same_fields() {
        let repository = SqliteTaskRepository::new(database::open_in_memory().unwrap());
        let saved = task("id-1", "Buy milk", "2026-10-15T08:00:00.250Z");

        repository.insert(&saved).unwrap();

        assert_eq!(repository.list_active().unwrap(), vec![saved]);
    }

    #[test]
    fn list_orders_newest_first() {
        let repository = SqliteTaskRepository::new(database::open_in_memory().unwrap());
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
