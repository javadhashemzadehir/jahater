use chrono::{DateTime, Utc};

use super::task::Task;

/// Source of "now". Injected so time-dependent logic can be tested with a fake clock (ADR 006).
pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

pub trait TaskRepository: Send + Sync {
    fn insert(&self, task: &Task) -> Result<(), RepositoryError>;
    fn list_active(&self) -> Result<Vec<Task>, RepositoryError>;
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("storage failure: {0}")]
    Storage(String),
}
