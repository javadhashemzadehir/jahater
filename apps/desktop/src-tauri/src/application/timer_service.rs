use std::sync::{Arc, Mutex};

use chrono::{DateTime, Utc};
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

/// What the user can do about a timer that was still running when the app last closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrphanResolution {
    /// Keep counting as if the app had never closed.
    Resume,
    /// End the timer at the last moment the app saw it alive.
    StopAtLastSeen,
    /// Throw the entry away.
    Discard,
}

/// A timer left running by a previous session, with the numbers needed to decide.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrphanView {
    pub timer: TimerView,
    pub last_seen_at: DateTime<Utc>,
    /// How much time the entry would have if stopped at `last_seen_at`.
    pub elapsed_at_last_seen_seconds: i64,
}

/// Owns timer state (ADR 006): the frontend only displays what this returns.
pub struct TimerService {
    entries: Arc<dyn TimeEntryRepository>,
    tasks: Arc<dyn TaskRepository>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
    /// Id of the entry found running at startup and not yet resolved.
    orphan: Mutex<Option<String>>,
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
            orphan: Mutex::new(None),
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

    /// Call once at startup. A timer that is running (not paused) now was left behind by the
    /// previous session: either the app closed or it crashed. A paused timer accrues no time,
    /// so it is simply kept.
    pub fn detect_orphan(&self) -> Result<(), ApplicationError> {
        let found = self
            .entries
            .find_running()?
            .filter(|entry| !entry.is_paused())
            .map(|entry| entry.id);
        *self.orphan.lock().expect("orphan lock") = found;
        Ok(())
    }

    /// The unresolved orphan, if any.
    pub fn orphan(&self) -> Result<Option<OrphanView>, ApplicationError> {
        let Some(id) = self.orphan.lock().expect("orphan lock").clone() else {
            return Ok(None);
        };
        let running = self.entries.find_running()?;
        let Some(entry) = running.filter(|entry| entry.id == id && !entry.is_paused()) else {
            // Resolved elsewhere (the user stopped or paused it): nothing left to ask.
            *self.orphan.lock().expect("orphan lock") = None;
            return Ok(None);
        };
        let last_seen_at = last_seen(&entry);
        Ok(Some(OrphanView {
            elapsed_at_last_seen_seconds: entry.elapsed_seconds(last_seen_at),
            timer: self.view(entry),
            last_seen_at,
        }))
    }

    pub fn resolve_orphan(
        &self,
        resolution: OrphanResolution,
    ) -> Result<Option<TimerView>, ApplicationError> {
        let Some(orphan) = self.orphan()? else {
            return Err(ApplicationError::NoActiveTimer);
        };
        let now = self.clock.now();
        let mut entry = orphan.timer.entry;

        let result = match resolution {
            OrphanResolution::Resume => {
                // Counting simply continues. Refresh the heartbeat so it is not an orphan again.
                self.entries.touch_running(now)?;
                Some(self.view(entry))
            }
            OrphanResolution::StopAtLastSeen => {
                entry.stop_at(orphan.last_seen_at, now)?;
                self.entries.update(&entry)?;
                Some(self.view(entry))
            }
            OrphanResolution::Discard => {
                entry.discard(now)?;
                self.entries.update(&entry)?;
                None
            }
        };
        *self.orphan.lock().expect("orphan lock") = None;
        self.notifier.timer_changed();
        Ok(result)
    }

    /// Marks the running, unpaused timer as alive right now.
    pub fn heartbeat(&self) -> Result<(), ApplicationError> {
        Ok(self.entries.touch_running(self.clock.now())?)
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

/// The last time the app confirmed the entry was alive; falls back to its last change.
fn last_seen(entry: &TimeEntry) -> DateTime<Utc> {
    entry
        .last_seen_at
        .unwrap_or(entry.updated_at)
        .max(entry.started_at)
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

        fn touch_running(&self, at: DateTime<Utc>) -> Result<(), RepositoryError> {
            let mut rows = self.rows.lock().unwrap();
            for entry in rows.iter_mut().filter(|e| e.is_running && !e.is_paused()) {
                entry.last_seen_at = Some(at);
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

    /// Simulates closing the app: the same data, a fresh service with no memory of the session.
    fn restart(f: &Fixture) -> TimerService {
        let service = TimerService::new(
            f.entries.clone(),
            Arc::new(KnownTasks(Vec::new())),
            f.clock.clone(),
            f.notifier.clone(),
        );
        service.detect_orphan().unwrap();
        service
    }

    #[test]
    fn a_timer_left_running_is_offered_for_recovery_with_its_last_seen_time() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(600);
        f.service.heartbeat().unwrap();
        f.clock.advance(7200); // the app was closed for two hours

        let service = restart(&f);
        let orphan = service.orphan().unwrap().unwrap();
        assert_eq!(orphan.elapsed_at_last_seen_seconds, 600);
        assert_eq!(orphan.timer.elapsed_seconds, 7800);
    }

    #[test]
    fn stopping_at_the_last_seen_time_keeps_only_the_time_that_was_certainly_worked() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(600);
        f.service.heartbeat().unwrap();
        f.clock.advance(7200);

        let service = restart(&f);
        let stopped = service
            .resolve_orphan(OrphanResolution::StopAtLastSeen)
            .unwrap()
            .unwrap();

        assert_eq!(stopped.elapsed_seconds, 600);
        assert!(!stopped.entry.is_running);
        assert!(service.active().unwrap().is_none());
        assert!(service.orphan().unwrap().is_none());
    }

    #[test]
    fn resume_keeps_counting_and_clears_the_prompt() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(300);

        let service = restart(&f);
        let resumed = service
            .resolve_orphan(OrphanResolution::Resume)
            .unwrap()
            .unwrap();
        assert!(resumed.entry.is_running);
        assert_eq!(resumed.elapsed_seconds, 300);
        assert!(service.orphan().unwrap().is_none());
    }

    #[test]
    fn discard_removes_the_entry_from_view() {
        let f = fixture();
        let started = f.service.start(tracker(None)).unwrap();
        f.clock.advance(300);

        let service = restart(&f);
        assert!(service
            .resolve_orphan(OrphanResolution::Discard)
            .unwrap()
            .is_none());
        assert!(service.active().unwrap().is_none());
        let stored = f.entries.find(&started.entry.id).unwrap().unwrap();
        assert!(stored.deleted_at.is_some());
        assert!(!stored.is_running);
    }

    #[test]
    fn a_paused_timer_is_not_an_orphan() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        f.clock.advance(60);
        f.service.pause().unwrap();

        let service = restart(&f);
        assert!(service.orphan().unwrap().is_none());
        assert!(service.active().unwrap().unwrap().entry.is_paused());
    }

    #[test]
    fn no_timer_means_no_orphan_and_resolving_says_so() {
        let f = fixture();
        let service = restart(&f);
        assert!(service.orphan().unwrap().is_none());
        assert!(matches!(
            service.resolve_orphan(OrphanResolution::Resume),
            Err(ApplicationError::NoActiveTimer)
        ));
    }

    #[test]
    fn stopping_the_timer_normally_clears_the_orphan() {
        let f = fixture();
        f.service.start(tracker(None)).unwrap();
        let service = restart(&f);
        assert!(service.orphan().unwrap().is_some());

        service.stop().unwrap();
        assert!(service.orphan().unwrap().is_none());
    }
}
