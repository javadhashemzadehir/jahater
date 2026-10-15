use std::sync::Arc;

use chrono::{DateTime, Duration, Utc};
use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::block::{BlockPatch, NewBlock, TimeBlock, MAX_BLOCK_MINUTES};
use crate::domain::ports::{BlockRepository, ChangeNotifier, Clock, TaskRepository};

/// Planned blocks on the timeline. Blocks never move on their own: only an explicit call changes one.
pub struct BlockService {
    blocks: Arc<dyn BlockRepository>,
    tasks: Arc<dyn TaskRepository>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
}

impl BlockService {
    pub fn new(
        blocks: Arc<dyn BlockRepository>,
        tasks: Arc<dyn TaskRepository>,
        clock: Arc<dyn Clock>,
        notifier: Arc<dyn ChangeNotifier>,
    ) -> Self {
        Self {
            blocks,
            tasks,
            clock,
            notifier,
        }
    }

    pub fn create_block(&self, input: NewBlock) -> Result<TimeBlock, ApplicationError> {
        self.ensure_task(input.task_id.as_deref())?;
        let block = TimeBlock::new(Uuid::now_v7().to_string(), input, self.clock.now())?;
        self.blocks.insert(&block)?;
        self.notifier.tasks_changed();
        Ok(block)
    }

    pub fn update_block(&self, id: &str, patch: BlockPatch) -> Result<TimeBlock, ApplicationError> {
        if let Some(Some(task_id)) = &patch.task_id {
            self.ensure_task(Some(task_id))?;
        }
        let mut block = self.active(id)?;
        block.apply(patch, self.clock.now())?;
        self.blocks.update(&block)?;
        self.notifier.tasks_changed();
        Ok(block)
    }

    pub fn delete_block(&self, id: &str) -> Result<(), ApplicationError> {
        let mut block = self.active(id)?;
        block.delete(self.clock.now());
        self.blocks.update(&block)?;
        self.notifier.tasks_changed();
        Ok(())
    }

    /// Blocks with any part inside `[from, to)`, earliest first.
    pub fn list_blocks(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<TimeBlock>, ApplicationError> {
        // A block can start up to a day before `from` and still reach into the range.
        let earliest_start = from - Duration::minutes(i64::from(MAX_BLOCK_MINUTES));
        let mut found: Vec<TimeBlock> = self
            .blocks
            .list_starting_between(earliest_start, to)?
            .into_iter()
            .filter(|block| block.overlaps(from, to))
            .collect();
        found.sort_by(|a, b| a.start_at.cmp(&b.start_at).then_with(|| a.id.cmp(&b.id)));
        Ok(found)
    }

    fn active(&self, id: &str) -> Result<TimeBlock, ApplicationError> {
        self.blocks
            .find_active(id)?
            .ok_or(ApplicationError::BlockNotFound)
    }

    fn ensure_task(&self, task_id: Option<&str>) -> Result<(), ApplicationError> {
        if let Some(id) = task_id {
            self.tasks
                .find_active(id)?
                .ok_or(ApplicationError::TaskNotFound)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::Ordering;
    use std::sync::Mutex;

    use super::*;
    use crate::application::test_support::{CountingNotifier, FixedClock};
    use crate::domain::block::BlockKind;
    use crate::domain::errors::DomainError;
    use crate::domain::ports::RepositoryError;
    use crate::domain::task::{NewTask, Task};

    #[derive(Default)]
    struct MemoryBlocks {
        rows: Mutex<Vec<TimeBlock>>,
    }

    impl BlockRepository for MemoryBlocks {
        fn insert(&self, block: &TimeBlock) -> Result<(), RepositoryError> {
            self.rows.lock().unwrap().push(block.clone());
            Ok(())
        }

        fn update(&self, block: &TimeBlock) -> Result<(), RepositoryError> {
            let mut rows = self.rows.lock().unwrap();
            if let Some(slot) = rows.iter_mut().find(|b| b.id == block.id) {
                *slot = block.clone();
            }
            Ok(())
        }

        fn find_active(&self, id: &str) -> Result<Option<TimeBlock>, RepositoryError> {
            Ok(self
                .rows
                .lock()
                .unwrap()
                .iter()
                .find(|b| b.id == id && b.deleted_at.is_none())
                .cloned())
        }

        fn list_starting_between(
            &self,
            from: DateTime<Utc>,
            to: DateTime<Utc>,
        ) -> Result<Vec<TimeBlock>, RepositoryError> {
            Ok(self
                .rows
                .lock()
                .unwrap()
                .iter()
                .filter(|b| b.deleted_at.is_none() && b.start_at > from && b.start_at < to)
                .cloned()
                .collect())
        }
    }

    struct OneTask(Task);

    impl TaskRepository for OneTask {
        fn insert(&self, _: &Task) -> Result<(), RepositoryError> {
            Ok(())
        }
        fn update(&self, _: &Task) -> Result<(), RepositoryError> {
            Ok(())
        }
        fn purge(&self, _: &str) -> Result<bool, RepositoryError> {
            Ok(false)
        }
        fn find_active(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
            Ok((self.0.id == id).then(|| self.0.clone()))
        }
        fn find_trashed(&self, _: &str) -> Result<Option<Task>, RepositoryError> {
            Ok(None)
        }
        fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(vec![self.0.clone()])
        }
        fn list_trashed(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(Vec::new())
        }
    }

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn fixture() -> (BlockService, Arc<CountingNotifier>) {
        let clock = FixedClock::default();
        let task = Task::new(
            "task-1".into(),
            NewTask {
                title: "Write".into(),
                ..Default::default()
            },
            clock.0,
        )
        .unwrap();
        let notifier = Arc::new(CountingNotifier::default());
        let service = BlockService::new(
            Arc::new(MemoryBlocks::default()),
            Arc::new(OneTask(task)),
            Arc::new(clock),
            notifier.clone(),
        );
        (service, notifier)
    }

    fn new_block(task_id: Option<&str>, start: &str, minutes: u32) -> NewBlock {
        NewBlock {
            task_id: task_id.map(str::to_owned),
            kind: BlockKind::Task,
            title: None,
            start_at: at(start),
            duration_min: minutes,
        }
    }

    #[test]
    fn created_block_is_listed_for_its_day_and_notifies() {
        let (service, notifier) = fixture();
        let block = service
            .create_block(new_block(Some("task-1"), "2026-10-15T09:00:00Z", 30))
            .unwrap();

        let day = service
            .list_blocks(at("2026-10-15T00:00:00Z"), at("2026-10-16T00:00:00Z"))
            .unwrap();
        assert_eq!(day, vec![block]);
        assert_eq!(notifier.count.load(Ordering::SeqCst), 1);

        let other_day = service
            .list_blocks(at("2026-10-16T00:00:00Z"), at("2026-10-17T00:00:00Z"))
            .unwrap();
        assert!(other_day.is_empty());
    }

    #[test]
    fn a_block_that_started_the_evening_before_still_shows_on_the_next_day() {
        let (service, _) = fixture();
        service
            .create_block(new_block(None, "2026-10-14T23:30:00Z", 120))
            .unwrap();

        let day = service
            .list_blocks(at("2026-10-15T00:00:00Z"), at("2026-10-16T00:00:00Z"))
            .unwrap();
        assert_eq!(day.len(), 1);
    }

    #[test]
    fn list_is_sorted_by_start() {
        let (service, _) = fixture();
        service
            .create_block(new_block(None, "2026-10-15T14:00:00Z", 30))
            .unwrap();
        service
            .create_block(new_block(None, "2026-10-15T08:00:00Z", 30))
            .unwrap();

        let starts: Vec<_> = service
            .list_blocks(at("2026-10-15T00:00:00Z"), at("2026-10-16T00:00:00Z"))
            .unwrap()
            .into_iter()
            .map(|b| b.start_at)
            .collect();
        assert_eq!(
            starts,
            vec![at("2026-10-15T08:00:00Z"), at("2026-10-15T14:00:00Z")]
        );
    }

    #[test]
    fn update_moves_the_block_and_bumps_the_revision() {
        let (service, _) = fixture();
        let block = service
            .create_block(new_block(None, "2026-10-15T09:00:00Z", 30))
            .unwrap();

        let moved = service
            .update_block(
                &block.id,
                BlockPatch {
                    start_at: Some(at("2026-10-15T11:15:00Z")),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(moved.start_at, at("2026-10-15T11:15:00Z"));
        assert_eq!(moved.revision, 2);
    }

    #[test]
    fn deleted_blocks_disappear_and_cannot_be_edited() {
        let (service, _) = fixture();
        let block = service
            .create_block(new_block(None, "2026-10-15T09:00:00Z", 30))
            .unwrap();
        service.delete_block(&block.id).unwrap();

        assert!(service
            .list_blocks(at("2026-10-15T00:00:00Z"), at("2026-10-16T00:00:00Z"))
            .unwrap()
            .is_empty());
        assert!(matches!(
            service.update_block(&block.id, BlockPatch::default()),
            Err(ApplicationError::BlockNotFound)
        ));
    }

    #[test]
    fn unknown_task_and_bad_duration_are_rejected() {
        let (service, notifier) = fixture();
        assert!(matches!(
            service.create_block(new_block(Some("nope"), "2026-10-15T09:00:00Z", 30)),
            Err(ApplicationError::TaskNotFound)
        ));
        assert!(matches!(
            service.create_block(new_block(None, "2026-10-15T09:00:00Z", 0)),
            Err(ApplicationError::Domain(DomainError::InvalidDuration))
        ));
        assert_eq!(notifier.count.load(Ordering::SeqCst), 0);
    }
}
