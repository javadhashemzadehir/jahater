use chrono::{DateTime, Utc};

use super::block::TimeBlock;
use super::label::{Label, LabelKind};
use super::task::Task;
use super::timer::TimeEntry;

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

pub trait TimeEntryRepository: Send + Sync {
    /// The entry with `is_running = 1` (running or paused), if any.
    fn find_running(&self) -> Result<Option<TimeEntry>, RepositoryError>;
    fn find(&self, id: &str) -> Result<Option<TimeEntry>, RepositoryError>;
    /// Writes `stopped` (the previous running entry, already ended) and inserts `started` in
    /// one transaction, so there is never a moment with two running entries or none by accident.
    fn replace_running(
        &self,
        stopped: Option<&TimeEntry>,
        started: &TimeEntry,
    ) -> Result<(), RepositoryError>;
    /// Overwrites every mutable column of an existing entry.
    fn update(&self, entry: &TimeEntry) -> Result<(), RepositoryError>;
}

pub trait BlockRepository: Send + Sync {
    fn insert(&self, block: &TimeBlock) -> Result<(), RepositoryError>;
    /// Overwrites every mutable column, including `deleted_at`.
    fn update(&self, block: &TimeBlock) -> Result<(), RepositoryError>;
    fn find_active(&self, id: &str) -> Result<Option<TimeBlock>, RepositoryError>;
    /// Active blocks whose start lies strictly between `from` and `to`.
    fn list_starting_between(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<TimeBlock>, RepositoryError>;
}

/// Tells the UI that task data changed, so every view refetches (FR-15).
pub trait ChangeNotifier: Send + Sync {
    fn tasks_changed(&self);
    /// The running timer started, paused, resumed or stopped.
    fn timer_changed(&self) {}
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("storage failure: {0}")]
    Storage(String),
}
