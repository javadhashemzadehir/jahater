use chrono::{DateTime, Utc};

use super::errors::DomainError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    Todo,
    Doing,
    Done,
    Archived,
}

impl TaskStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Todo => "todo",
            Self::Doing => "doing",
            Self::Done => "done",
            Self::Archived => "archived",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "todo" => Some(Self::Todo),
            "doing" => Some(Self::Doing),
            "done" => Some(Self::Done),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub status: TaskStatus,
    pub is_urgent: bool,
    pub is_important: bool,
    pub estimate_minutes: Option<u32>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Fields a caller may set on a new task. Everything else starts at its default.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct NewTask {
    pub title: String,
    pub notes: Option<String>,
    pub is_urgent: bool,
    pub is_important: bool,
    pub estimate_minutes: Option<u32>,
}

/// A partial update. `None` leaves a field alone; `Some(None)` clears an optional field.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TaskPatch {
    pub title: Option<String>,
    pub notes: Option<Option<String>>,
    pub status: Option<TaskStatus>,
    pub is_urgent: Option<bool>,
    pub is_important: Option<bool>,
    pub estimate_minutes: Option<Option<u32>>,
}

impl Task {
    /// Builds a new task, trimming the title and rejecting an empty one.
    pub fn new(id: String, input: NewTask, now: DateTime<Utc>) -> Result<Self, DomainError> {
        Ok(Self {
            id,
            title: normalize_title(&input.title)?,
            notes: normalize_notes(input.notes),
            status: TaskStatus::Todo,
            is_urgent: input.is_urgent,
            is_important: input.is_important,
            estimate_minutes: validate_estimate(input.estimate_minutes)?,
            deleted_at: None,
            revision: 1,
            created_at: now,
            updated_at: now,
        })
    }

    /// Applies a patch. All fields are validated before any is changed.
    pub fn apply(&mut self, patch: TaskPatch, now: DateTime<Utc>) -> Result<(), DomainError> {
        let title = patch.title.as_deref().map(normalize_title).transpose()?;
        let notes = patch.notes.map(normalize_notes);
        let estimate = patch.estimate_minutes.map(validate_estimate).transpose()?;

        if let Some(title) = title {
            self.title = title;
        }
        if let Some(notes) = notes {
            self.notes = notes;
        }
        if let Some(status) = patch.status {
            self.status = status;
        }
        if let Some(is_urgent) = patch.is_urgent {
            self.is_urgent = is_urgent;
        }
        if let Some(is_important) = patch.is_important {
            self.is_important = is_important;
        }
        if let Some(estimate) = estimate {
            self.estimate_minutes = estimate;
        }

        self.touch(now);
        Ok(())
    }

    /// Moves the task to Trash. Trashed tasks keep their fields until purged.
    pub fn trash(&mut self, now: DateTime<Utc>) {
        self.deleted_at = Some(now);
        self.touch(now);
    }

    pub fn restore(&mut self, now: DateTime<Utc>) {
        self.deleted_at = None;
        self.touch(now);
    }

    pub fn is_trashed(&self) -> bool {
        self.deleted_at.is_some()
    }

    fn touch(&mut self, now: DateTime<Utc>) {
        self.revision += 1;
        self.updated_at = now;
    }
}

fn normalize_title(value: &str) -> Result<String, DomainError> {
    let title = value.trim();
    if title.is_empty() {
        return Err(DomainError::EmptyTitle);
    }
    Ok(title.to_owned())
}

fn normalize_notes(value: Option<String>) -> Option<String> {
    value.filter(|text| !text.trim().is_empty())
}

fn validate_estimate(value: Option<u32>) -> Result<Option<u32>, DomainError> {
    match value {
        Some(0) => Err(DomainError::InvalidEstimate),
        other => Ok(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn later() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-10-15T09:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn task(title: &str) -> Task {
        Task::new(
            "id-1".into(),
            NewTask {
                title: title.into(),
                ..Default::default()
            },
            now(),
        )
        .unwrap()
    }

    #[test]
    fn trims_title_and_starts_as_todo() {
        let task = task("  Write report  ");
        assert_eq!(task.title, "Write report");
        assert_eq!(task.status, TaskStatus::Todo);
        assert_eq!(task.revision, 1);
        assert!(!task.is_trashed());
    }

    #[test]
    fn rejects_blank_title() {
        let input = NewTask {
            title: "   ".into(),
            ..Default::default()
        };
        assert_eq!(
            Task::new("id-1".into(), input, now()),
            Err(DomainError::EmptyTitle)
        );
    }

    #[test]
    fn rejects_zero_estimate_and_blank_notes_are_dropped() {
        let zero = NewTask {
            title: "A".into(),
            estimate_minutes: Some(0),
            ..Default::default()
        };
        assert_eq!(
            Task::new("id".into(), zero, now()),
            Err(DomainError::InvalidEstimate)
        );

        let blank = NewTask {
            title: "A".into(),
            notes: Some("  ".into()),
            ..Default::default()
        };
        assert_eq!(Task::new("id".into(), blank, now()).unwrap().notes, None);
    }

    #[test]
    fn patch_changes_only_given_fields_and_bumps_revision() {
        let mut task = task("Old");
        task.apply(
            TaskPatch {
                is_urgent: Some(true),
                notes: Some(Some("n".into())),
                ..Default::default()
            },
            later(),
        )
        .unwrap();

        assert_eq!(task.title, "Old");
        assert!(task.is_urgent);
        assert_eq!(task.notes.as_deref(), Some("n"));
        assert_eq!(task.revision, 2);
        assert_eq!(task.updated_at, later());
    }

    #[test]
    fn invalid_patch_changes_nothing() {
        let mut task = task("Old");
        let result = task.apply(
            TaskPatch {
                title: Some("New".into()),
                estimate_minutes: Some(Some(0)),
                ..Default::default()
            },
            later(),
        );

        assert_eq!(result, Err(DomainError::InvalidEstimate));
        assert_eq!(task.title, "Old");
        assert_eq!(task.revision, 1);
    }

    #[test]
    fn clearing_estimate_and_notes_uses_some_none() {
        let mut task = task("A");
        task.estimate_minutes = Some(30);
        task.notes = Some("n".into());
        task.apply(
            TaskPatch {
                estimate_minutes: Some(None),
                notes: Some(None),
                ..Default::default()
            },
            later(),
        )
        .unwrap();

        assert_eq!(task.estimate_minutes, None);
        assert_eq!(task.notes, None);
    }

    #[test]
    fn trash_and_restore_round_trip() {
        let mut task = task("A");
        task.trash(later());
        assert!(task.is_trashed());
        assert_eq!(task.deleted_at, Some(later()));

        task.restore(later());
        assert!(!task.is_trashed());
        assert_eq!(task.revision, 3);
    }

    #[test]
    fn status_round_trips_through_text() {
        for status in [
            TaskStatus::Todo,
            TaskStatus::Doing,
            TaskStatus::Done,
            TaskStatus::Archived,
        ] {
            assert_eq!(TaskStatus::parse(status.as_str()), Some(status));
        }
        assert_eq!(TaskStatus::parse("unknown"), None);
    }
}
