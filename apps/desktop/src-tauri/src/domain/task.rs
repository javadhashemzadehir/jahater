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
    pub status: TaskStatus,
    pub is_urgent: bool,
    pub is_important: bool,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Task {
    /// Builds a new task, trimming the title and rejecting an empty one.
    pub fn new(id: String, title: &str, now: DateTime<Utc>) -> Result<Self, DomainError> {
        let title = title.trim();
        if title.is_empty() {
            return Err(DomainError::EmptyTitle);
        }

        Ok(Self {
            id,
            title: title.to_owned(),
            status: TaskStatus::Todo,
            is_urgent: false,
            is_important: false,
            revision: 1,
            created_at: now,
            updated_at: now,
        })
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

    #[test]
    fn trims_title_and_starts_as_todo() {
        let task = Task::new("id-1".into(), "  Write report  ", now()).unwrap();
        assert_eq!(task.title, "Write report");
        assert_eq!(task.status, TaskStatus::Todo);
        assert_eq!(task.revision, 1);
    }

    #[test]
    fn rejects_blank_title() {
        assert_eq!(
            Task::new("id-1".into(), "   ", now()),
            Err(DomainError::EmptyTitle)
        );
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
