use std::sync::Arc;

use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::ports::{ChangeNotifier, Clock, TaskRepository, TimeEntryRepository};
use crate::domain::timer::{StartTimer, TimeEntry};

/// An entry together with the numbers the UI shows, all computed from one `now`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimerView {
    pub entry: TimeEntry,
    pub elapsed_seconds: i64,
    /// `None` when the entry has no target.
    pub remaining_seconds: Option<i64>,
}

/// Owns timer state (ADR 006): the frontend only displays what this returns.
pub struct TimerService {
    entries: Arc<dyn TimeEntryRepository>,
    tasks: Arc<dyn TaskRepository>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
}

impl TimerService {
    pub fn new(
        entries: Arc<dyn TimeEntryRepository>,
        tasks: Arc<dyn TaskRepository>,
        clock: Arc<dyn Clock>,
        notifier: Arc<dyn ChangeNotifier>,
    ) -> Self {
        Self {
            entries,
            tasks,
            clock,
            notifier,
        }
    }

    /// Starts a timer. Any running or paused timer is stopped first, in the same transaction.
    pub fn start(&self, input: StartTimer) -> Result<TimerView, ApplicationError> {
        if let Some(task_id) = &input.task_id {
            self.tasks
                .find_active(task_id)?
                .ok_or(ApplicationError::TaskNotFound)?;
        }

        let now = self.clock.now();
        let started = TimeEntry::start(Uuid::now_v7().to_string(), input, now)?;
        let mut previous = self.entries.find_running()?;
        if let Some(entry) = previous.as_mut() {
            entry.stop(now)?;
        }

        self.entries.replace_running(previous.as_ref(), &started)?;
        self.notifier.timer_changed();
        Ok(self.view(started))
    }

    pub fn pause(&self) -> Result<TimerView, ApplicationError> {
        self.change(|entry, now| entry.pause(now))
    }

    pub fn resume(&self) -> Result<TimerView, ApplicationError> {
        self.change(|entry, now| entry.resume(now))
    }

    pub fn stop(&self) -> Result<TimerView, ApplicationError> {
        self.change(|entry, now| entry.stop(now))
    }

    pub fn active(&self) -> Result<Option<TimerView>, ApplicationError> {
        Ok(self.entries.find_running()?.map(|entry| self.view(entry)))
    }

    fn change(
        &self,
        apply: impl FnOnce(
            &mut TimeEntry,
            chrono::DateTime<chrono::Utc>,
        ) -> Result<(), crate::domain::errors::DomainError>,
    ) -> Result<TimerView, ApplicationError> {
        let mut entry = self
            .entries
            .find_running()?
            .ok_or(ApplicationError::NoActiveTimer)?;
        apply(&mut entry, self.clock.now())?;
        self.entries.update(&entry)?;
        self.notifier.timer_changed();
        Ok(self.view(entry))
    }

    fn view(&self, entry: TimeEntry) -> TimerView {
        let now = self.clock.now();
        TimerView {
            elapsed_seconds: entry.elapsed_seconds(now),
            remaining_seconds: entry.remaining_seconds(now),
            entry,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;
    use crate::application::test_support::{CountingNotifier, ManualClock};
    use crate::domain::errors::DomainError;
    use crate::domain::ports::RepositoryError;
    use crate::domain::task::{NewTask, Task};
    use crate::domain::timer::TimerMode;

    #[derive(Default)]
    struct MemoryEntries {
        rows: Mutex<Vec<TimeEntry>>,
    }

    impl TimeEntryRepository for MemoryEntries {
        fn find_running(&self) -> Result<Option<TimeEntry>, RepositoryError> {
            Ok(self
                .rows
                .lock()
                .unwrap()
                .iter()
                .find(|e| e.is_running)
                .cloned())
        }

        fn find(&self, id: &str) -> Result<Option<TimeEntry>, RepositoryError> {
            Ok(self
                .rows
                .lock()
                .unwrap()
                .iter()
                .find(|e| e.id == id)
                .cloned())
        }

        fn replace_running(
            &self,
            stopped: Option<&TimeEntry>,
            started: &TimeEntry,
        ) -> Result<(), RepositoryError> {
            let mut rows = self.rows.lock().unwrap();
            if let Some(entry) = stopped {
                if let Some(slot) = rows.iter_mut().find(|e| e.id == entry.id) {
                    *slot = entry.clone();
                }
            }
            if rows.iter().any(|e| e.is_running) {
                return Err(RepositoryError::Storage("one running entry".into()));
            }
            rows.push(started.clone());
            Ok(())
        }

        fn update(&self, entry: &TimeEntry) -> Result<(), RepositoryError> {
            let mut rows = self.rows.lock().unwrap();
            if let Some(slot) = rows.iter_mut().find(|e| e.id == entry.id) {
                *slot = entry.clone();
            }
            Ok(())
        }
    }

    /// Knows a fixed set of task ids; everything else is unused by the timer.
    struct KnownTasks(Vec<Task>);

    impl TaskRepository for KnownTasks {
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
            Ok(self.0.iter().find(|t| t.id == id).cloned())
        }
        fn find_trashed(&self, _: &str) -> Result<Option<Task>, RepositoryError> {
            Ok(None)
        }
        fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(self.0.clone())
        }
        fn list_trashed(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(Vec::new())
        }
    }

    struct Fixture {
        service: TimerService,
        clock: Arc<ManualClock>,
        entries: Arc<MemoryEntries>,
        notifier: Arc<CountingNotifier>,
    }

    fn fixture() -> Fixture {
        let clock = Arc::new(ManualClock::default());
        let entries = Arc::new(MemoryEntries::default());
        let notifier = Arc::new(CountingNotifier::default());
        let task = Task::new(
            "task-1".into(),
            NewTask {
                title: "Write".into(),
                ..Default::default()
            },
            clock.now(),
        )
        .unwrap();
        let service = TimerService::new(
            entries.clone(),
            Arc::new(KnownTasks(vec![task])),
            clock.clone(),
            notifier.clone(),
        );
        Fixture {
            service,
            clock,
            entries,
            notifier,
        }
    }

    fn tracker(task_id: Option<&str>) -> StartTimer {
        StartTimer {
            task_id: task_id.map(str::to_owned),
            mode: TimerMode::Tracker,
            target_min: None,
            note: None,
        }
    }

    fn timebox(minutes: u32) -> StartTimer {
        StartTimer {
            task_id: None,
            mode: TimerMode::Timebox,
            target_min: Some(minutes),
            note: None,
        }
    }

    #[test]
    fn start_persists_and_reports_elapsed_from_the_clock() {
        let f = fixture();
        f.service.start(tracker(Some("task-1"))).unwrap();
        f.clock.advance(90);

        let view = f.service.active().unwrap().unwrap();
        assert_eq!(view.elapsed_seconds, 90);
        assert_eq!(view.entry.task_id.as_deref(), Some("task-1"));
        assert_eq!(
            f.notifier
                .timer_count
                .load(std::sync::atomic::Ordering::SeqCst),
            1
        );
    }

    #[test]
    fn unknown_task_is_rejected_and_nothing_starts() {
        let f = fixture();
        assert!(matches!(
            f.service.start(tracker(Some("missing"))),
            Err(ApplicationError::TaskNotFound)
        ));
        assert!(f.service.active().unwrap().is_none());
    }

    #[test]
    fn starting_a_second_timer_stops_the_first_at_that_moment() {
        let f = fixture();
        let first = f.service.start(tracker(None)).unwrap();
        f.clock.advance(600);
        let second = f.service.start(timebox(25)).unwrap();

        let stopped = f.entries.find(&first.entry.id).unwrap().unwrap();
        assert!(!stopped.is_running);
        assert_eq!(stopped.elapsed_seconds(f.clock.now()), 600);
        assert_eq!(
            f.service.active().unwrap().unwrap().entry.id,
            second.entry.id
        );
    }

    #[test]
    fn pause_resume_and_stop_follow_the_clock() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(300);
        f.service.pause().unwrap();
        f.clock.advance(1200);

        assert_eq!(f.service.active().unwrap().unwrap().elapsed_seconds, 300);

        f.service.resume().unwrap();
        f.clock.advance(60);
        let stopped = f.service.stop().unwrap();

        assert_eq!(stopped.elapsed_seconds, 360);
        assert!(f.service.active().unwrap().is_none());
    }

    #[test]
    fn sleeping_through_a_running_timer_counts_the_whole_gap() {
        // No ticks run while the machine sleeps; the next read still sees the real span.
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(8 * 3600);
        assert_eq!(
            f.service.active().unwrap().unwrap().elapsed_seconds,
            8 * 3600
        );
    }

    #[test]
    fn a_timebox_counts_down_and_reaches_its_target() {
        let f = fixture();
        f.service.start(timebox(10)).unwrap();
        f.clock.advance(240);
        assert_eq!(
            f.service.active().unwrap().unwrap().remaining_seconds,
            Some(360)
        );

        f.clock.advance(400);
        assert_eq!(
            f.service.active().unwrap().unwrap().remaining_seconds,
            Some(0)
        );
    }

    #[test]
    fn commands_without_a_running_timer_say_so() {
        let f = fixture();
        assert!(matches!(
            f.service.pause(),
            Err(ApplicationError::NoActiveTimer)
        ));
        assert!(matches!(
            f.service.resume(),
            Err(ApplicationError::NoActiveTimer)
        ));
        assert!(matches!(
            f.service.stop(),
            Err(ApplicationError::NoActiveTimer)
        ));
    }

    #[test]
    fn invalid_transitions_surface_domain_errors_and_change_nothing() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        assert!(matches!(
            f.service.resume(),
            Err(ApplicationError::Domain(DomainError::TimerNotPaused))
        ));
        f.service.pause().unwrap();
        assert!(matches!(
            f.service.pause(),
            Err(ApplicationError::Domain(DomainError::TimerAlreadyPaused))
        ));
        assert!(f.service.active().unwrap().unwrap().entry.is_paused());
    }

    #[test]
    fn a_timebox_without_a_target_does_not_start() {
        let f = fixture();
        let result = f.service.start(StartTimer {
            task_id: None,
            mode: TimerMode::Timebox,
            target_min: None,
            note: None,
        });
        assert!(matches!(
            result,
            Err(ApplicationError::Domain(DomainError::TimerTargetRequired))
        ));
        assert!(f.service.active().unwrap().is_none());
    }

    #[test]
    fn a_system_clock_moved_back_never_shows_negative_time() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(-3600);
        assert_eq!(f.service.active().unwrap().unwrap().elapsed_seconds, 0);
    }
}
