use chrono::{DateTime, Duration, Utc};

use super::errors::DomainError;

/// A block never spans more than a day.
pub const MAX_BLOCK_MINUTES: u32 = 24 * 60;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlockKind {
    Task,
    Buffer,
    Transition,
    Free,
    Event,
}

impl BlockKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Task => "task",
            Self::Buffer => "buffer",
            Self::Transition => "transition",
            Self::Free => "free",
            Self::Event => "event",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "task" => Some(Self::Task),
            "buffer" => Some(Self::Buffer),
            "transition" => Some(Self::Transition),
            "free" => Some(Self::Free),
            "event" => Some(Self::Event),
            _ => None,
        }
    }
}

/// A planned span on the timeline. It is a plan, not tracked time (that is `TimeEntry`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimeBlock {
    pub id: String,
    pub task_id: Option<String>,
    pub kind: BlockKind,
    pub title: Option<String>,
    pub start_at: DateTime<Utc>,
    pub duration_min: u32,
    pub deleted_at: Option<DateTime<Utc>>,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewBlock {
    pub task_id: Option<String>,
    pub kind: BlockKind,
    pub title: Option<String>,
    pub start_at: DateTime<Utc>,
    pub duration_min: u32,
}

/// `None` leaves a field alone; `Some(None)` clears an optional one.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct BlockPatch {
    pub task_id: Option<Option<String>>,
    pub title: Option<Option<String>>,
    pub start_at: Option<DateTime<Utc>>,
    pub duration_min: Option<u32>,
}

impl TimeBlock {
    pub fn new(id: String, input: NewBlock, now: DateTime<Utc>) -> Result<Self, DomainError> {
        Ok(Self {
            id,
            task_id: input.task_id,
            kind: input.kind,
            title: normalize_title(input.title),
            start_at: input.start_at,
            duration_min: validate_duration(input.duration_min)?,
            deleted_at: None,
            revision: 1,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn apply(&mut self, patch: BlockPatch, now: DateTime<Utc>) -> Result<(), DomainError> {
        let duration = patch.duration_min.map(validate_duration).transpose()?;

        if let Some(task_id) = patch.task_id {
            self.task_id = task_id;
        }
        if let Some(title) = patch.title {
            self.title = normalize_title(title);
        }
        if let Some(start_at) = patch.start_at {
            self.start_at = start_at;
        }
        if let Some(duration) = duration {
            self.duration_min = duration;
        }
        self.touch(now);
        Ok(())
    }

    pub fn delete(&mut self, now: DateTime<Utc>) {
        self.deleted_at = Some(now);
        self.touch(now);
    }

    pub fn end_at(&self) -> DateTime<Utc> {
        self.start_at + Duration::minutes(i64::from(self.duration_min))
    }

    /// True when any part of the block falls inside `[from, to)`.
    pub fn overlaps(&self, from: DateTime<Utc>, to: DateTime<Utc>) -> bool {
        self.start_at < to && self.end_at() > from
    }

    fn touch(&mut self, now: DateTime<Utc>) {
        self.revision += 1;
        self.updated_at = now;
    }
}

fn validate_duration(value: u32) -> Result<u32, DomainError> {
    if value == 0 || value > MAX_BLOCK_MINUTES {
        return Err(DomainError::InvalidDuration);
    }
    Ok(value)
}

fn normalize_title(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().to_owned())
        .filter(|text| !text.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn block(start: &str, minutes: u32) -> TimeBlock {
        TimeBlock::new(
            "b1".into(),
            NewBlock {
                task_id: None,
                kind: BlockKind::Task,
                title: Some("  Deep work ".into()),
                start_at: at(start),
                duration_min: minutes,
            },
            at("2026-10-15T07:00:00Z"),
        )
        .unwrap()
    }

    #[test]
    fn new_block_trims_title_and_starts_at_revision_one() {
        let block = block("2026-10-15T09:00:00Z", 45);
        assert_eq!(block.title.as_deref(), Some("Deep work"));
        assert_eq!(block.revision, 1);
        assert_eq!(block.end_at(), at("2026-10-15T09:45:00Z"));
    }

    #[test]
    fn duration_must_be_positive_and_within_a_day() {
        for bad in [0, MAX_BLOCK_MINUTES + 1] {
            let result = TimeBlock::new(
                "b".into(),
                NewBlock {
                    task_id: None,
                    kind: BlockKind::Task,
                    title: None,
                    start_at: at("2026-10-15T09:00:00Z"),
                    duration_min: bad,
                },
                at("2026-10-15T07:00:00Z"),
            );
            assert_eq!(result, Err(DomainError::InvalidDuration));
        }
    }

    #[test]
    fn patch_moves_resizes_and_clears_without_touching_other_fields() {
        let mut block = block("2026-10-15T09:00:00Z", 45);
        block
            .apply(
                BlockPatch {
                    start_at: Some(at("2026-10-15T10:30:00Z")),
                    duration_min: Some(60),
                    title: Some(None),
                    ..Default::default()
                },
                at("2026-10-15T08:00:00Z"),
            )
            .unwrap();

        assert_eq!(block.start_at, at("2026-10-15T10:30:00Z"));
        assert_eq!(block.duration_min, 60);
        assert_eq!(block.title, None);
        assert_eq!(block.revision, 2);
    }

    #[test]
    fn an_invalid_patch_changes_nothing() {
        let mut block = block("2026-10-15T09:00:00Z", 45);
        let result = block.apply(
            BlockPatch {
                start_at: Some(at("2026-10-15T11:00:00Z")),
                duration_min: Some(0),
                ..Default::default()
            },
            at("2026-10-15T08:00:00Z"),
        );
        assert_eq!(result, Err(DomainError::InvalidDuration));
        assert_eq!(block.start_at, at("2026-10-15T09:00:00Z"));
        assert_eq!(block.revision, 1);
    }

    #[test]
    fn overlap_includes_blocks_that_cross_the_edges_but_not_ones_that_only_touch() {
        let day_start = at("2026-10-15T00:00:00Z");
        let day_end = at("2026-10-16T00:00:00Z");

        assert!(block("2026-10-14T23:30:00Z", 60).overlaps(day_start, day_end));
        assert!(block("2026-10-15T23:30:00Z", 60).overlaps(day_start, day_end));
        assert!(!block("2026-10-14T23:00:00Z", 60).overlaps(day_start, day_end));
        assert!(!block("2026-10-16T00:00:00Z", 30).overlaps(day_start, day_end));
    }

    #[test]
    fn kind_round_trips_through_text() {
        for kind in [
            BlockKind::Task,
            BlockKind::Buffer,
            BlockKind::Transition,
            BlockKind::Free,
            BlockKind::Event,
        ] {
            assert_eq!(BlockKind::parse(kind.as_str()), Some(kind));
        }
        assert_eq!(BlockKind::parse("nap"), None);
    }
}
