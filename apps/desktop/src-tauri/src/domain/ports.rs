use chrono::{DateTime, Utc};

use super::block::TimeBlock;
use super::label::{Label, LabelKind};
use super::review::DailyReview;
use super::snapshot::Snapshot;
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
    /// Finished, not discarded entries that started inside `[from, to)`, earliest first.
    fn list_finished_between(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<TimeEntry>, RepositoryError>;
    /// Records that the running, unpaused entry is alive at `at`. Does not bump `revision`.
    fn touch_running(&self, at: DateTime<Utc>) -> Result<(), RepositoryError>;
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

pub trait ReviewRepository: Send + Sync {
    fn find_by_day(&self, day: &str) -> Result<Option<DailyReview>, RepositoryError>;
    fn insert(&self, review: &DailyReview) -> Result<(), RepositoryError>;
    fn update(&self, review: &DailyReview) -> Result<(), RepositoryError>;
}

/// Small key/value store for device preferences.
pub trait MetaRepository: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<String>, RepositoryError>;
    fn set(&self, key: &str, value: &str) -> Result<(), RepositoryError>;
}

/// Reads and replaces all user data at once, for export, import and backups.
pub trait SnapshotStore: Send + Sync {
    fn export(&self) -> Result<Snapshot, RepositoryError>;
    /// Replaces everything in one transaction. On any error nothing changes.
    fn import(&self, snapshot: &Snapshot) -> Result<(), RepositoryError>;
}

/// Named JSON files in one folder.
pub trait BackupFiles: Send + Sync {
    fn write(&self, name: &str, content: &str) -> Result<(), RepositoryError>;
    fn read(&self, name: &str) -> Result<String, RepositoryError>;
    fn exists(&self, name: &str) -> Result<bool, RepositoryError>;
    /// File names, oldest name first.
    fn list(&self) -> Result<Vec<String>, RepositoryError>;
    fn delete(&self, name: &str) -> Result<(), RepositoryError>;
    /// Where the file lives, for showing to the user.
    fn location(&self, name: &str) -> Result<String, RepositoryError>;
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
    /// The data itself is wrong (a bad file name, an import that does not fit), not the disk.
    #[error("invalid data: {0}")]
    InvalidData(String),
}
