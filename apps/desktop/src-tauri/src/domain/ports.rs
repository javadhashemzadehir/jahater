use chrono::{DateTime, Utc};

use super::label::{Label, LabelKind};
use super::task::Task;

/// Source of "now". Injected so time-dependent logic can be tested with a fake clock (ADR 006).
pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

pub trait TaskRepository: Send + Sync {
    /// Inserts a new row.
    fn insert(&self, task: &Task) -> Result<(), RepositoryError>;
    /// Overwrites every mutable column of an existing row.
    fn update(&self, task: &Task) -> Result<(), RepositoryError>;
    /// Hard-deletes a row. Only used for trashed tasks.
    fn purge(&self, id: &str) -> Result<bool, RepositoryError>;
    fn find_active(&self, id: &str) -> Result<Option<Task>, RepositoryError>;
    fn find_trashed(&self, id: &str) -> Result<Option<Task>, RepositoryError>;
    fn list_active(&self) -> Result<Vec<Task>, RepositoryError>;
    fn list_trashed(&self) -> Result<Vec<Task>, RepositoryError>;
}

pub trait LabelRepository: Send + Sync {
    fn insert(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError>;
    fn update(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError>;
    /// Removes the label. Tasks that used it are kept and simply lose the link.
    fn delete(&self, kind: LabelKind, id: &str) -> Result<bool, RepositoryError>;
    fn find(&self, kind: LabelKind, id: &str) -> Result<Option<Label>, RepositoryError>;
    fn list(&self, kind: LabelKind) -> Result<Vec<Label>, RepositoryError>;
}

/// Tells the UI that task data changed, so every view refetches (FR-15).
pub trait ChangeNotifier: Send + Sync {
    fn tasks_changed(&self);
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("storage failure: {0}")]
    Storage(String),
}
