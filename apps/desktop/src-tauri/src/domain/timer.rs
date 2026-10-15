use chrono::{DateTime, Duration, Utc};

use super::errors::DomainError;

/// How a time entry is used. A mode is data on the entry, not separate machinery (ADR 006).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimerMode {
    Tracker,
    Timebox,
    Pomodoro,
    Flowtime,
}

impl TimerMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Tracker => "tracker",
            Self::Timebox => "timebox",
            Self::Pomodoro => "pomodoro",
            Self::Flowtime => "flowtime",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "tracker" => Some(Self::Tracker),
            "timebox" => Some(Self::Timebox),
            "pomodoro" => Some(Self::Pomodoro),
            "flowtime" => Some(Self::Flowtime),
            _ => None,
        }
    }
}

/// Length of a pomodoro when the caller gives no target.
pub const DEFAULT_POMODORO_MINUTES: u32 = 25;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StartTimer {
    pub task_id: Option<String>,
    pub mode: TimerMode,
    pub target_min: Option<u32>,
    pub note: Option<String>,
}

/// One tracked span of time. Elapsed time is always derived from absolute timestamps, so a
/// hidden window, a sleeping laptop or a missed tick never changes the result (ADR 006).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TimeEntry {
    pub id: String,
    pub task_id: Option<String>,
    pub mode: TimerMode,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    /// Total length of every closed pause, in whole seconds.
    pub paused_total_sec: i64,
    /// Set while a pause is open.
    pub paused_at: Option<DateTime<Utc>>,
    pub target_min: Option<u32>,
    pub is_running: bool,
    pub note: Option<String>,
    pub deleted_at: Option<DateTime<Utc>>,
    /// Last moment the app confirmed the timer was running. Used to recover after a crash.
    pub last_seen_at: Option<DateTime<Utc>>,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl TimeEntry {
    pub fn start(id: String, input: StartTimer, now: DateTime<Utc>) -> Result<Self, DomainError> {
        let target_min = resolve_target(input.mode, input.target_min)?;
        Ok(Self {
            id,
            task_id: input.task_id,
            mode: input.mode,
            started_at: now,
            ended_at: None,
            paused_total_sec: 0,
            paused_at: None,
            target_min,
            is_running: true,
            note: input.note.filter(|text| !text.trim().is_empty()),
            deleted_at: None,
            last_seen_at: Some(now),
            revision: 1,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn is_paused(&self) -> bool {
        self.paused_at.is_some()
    }

    /// Time actually worked, in whole seconds. Never negative, even if the system clock moved back.
    pub fn elapsed_seconds(&self, now: DateTime<Utc>) -> i64 {
        let end = self.ended_at.or(self.paused_at).unwrap_or(now);
        let gross = (end - self.started_at).num_seconds();
        (gross - self.paused_total_sec).max(0)
    }

    /// Seconds left on a target, or `None` when the entry has no target. Zero once reached.
    pub fn remaining_seconds(&self, now: DateTime<Utc>) -> Option<i64> {
        let target = i64::from(self.target_min?) * 60;
        Some((target - self.elapsed_seconds(now)).max(0))
    }

    pub fn target_reached(&self, now: DateTime<Utc>) -> bool {
        self.remaining_seconds(now) == Some(0)
    }

    pub fn pause(&mut self, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.ensure_running()?;
        if self.is_paused() {
            return Err(DomainError::TimerAlreadyPaused);
        }
        self.paused_at = Some(now);
        self.touch(now);
        Ok(())
    }

    pub fn resume(&mut self, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.ensure_running()?;
        let paused_at = self.paused_at.ok_or(DomainError::TimerNotPaused)?;
        self.paused_total_sec += pause_length(paused_at, now);
        self.paused_at = None;
        self.touch(now);
        Ok(())
    }

    /// Ends the entry. An open pause is closed first, so the stopped span excludes it.
    pub fn stop(&mut self, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.ensure_running()?;
        if let Some(paused_at) = self.paused_at.take() {
            self.paused_total_sec += pause_length(paused_at, now);
        }
        self.ended_at = Some(now);
        self.is_running = false;
        self.touch(now);
        Ok(())
    }

    /// Ends the entry at an earlier moment than `now`, such as the last time the app saw it alive.
    /// The end is never before the start.
    pub fn stop_at(&mut self, end: DateTime<Utc>, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.ensure_running()?;
        self.paused_at = None;
        self.ended_at = Some(end.max(self.started_at));
        self.is_running = false;
        self.touch(now);
        Ok(())
    }

    /// Throws the entry away: it stops running and is hidden, like a trashed task.
    pub fn discard(&mut self, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.ensure_running()?;
        self.paused_at = None;
        self.ended_at = Some(self.started_at);
        self.is_running = false;
        self.deleted_at = Some(now);
        self.touch(now);
        Ok(())
    }

    fn ensure_running(&self) -> Result<(), DomainError> {
        if self.is_running {
            Ok(())
        } else {
            Err(DomainError::TimerStopped)
        }
    }

    fn touch(&mut self, now: DateTime<Utc>) {
        self.revision += 1;
        self.updated_at = now;
    }
}

fn pause_length(paused_at: DateTime<Utc>, now: DateTime<Utc>) -> i64 {
    (now - paused_at).max(Duration::zero()).num_seconds()
}

fn resolve_target(mode: TimerMode, target: Option<u32>) -> Result<Option<u32>, DomainError> {
    if target == Some(0) {
        return Err(DomainError::InvalidTimerTarget);
    }
    match mode {
        TimerMode::Timebox => target.map(Some).ok_or(DomainError::TimerTargetRequired),
        TimerMode::Pomodoro => Ok(Some(target.unwrap_or(DEFAULT_POMODORO_MINUTES))),
        TimerMode::Tracker | TimerMode::Flowtime => Ok(target),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn input(mode: TimerMode, target_min: Option<u32>) -> StartTimer {
        StartTimer {
            task_id: None,
            mode,
            target_min,
            note: None,
        }
    }

    fn tracker() -> TimeEntry {
        TimeEntry::start(
            "e1".into(),
            input(TimerMode::Tracker, None),
            at("2026-10-15T08:00:00Z"),
        )
        .unwrap()
    }

    #[test]
    fn elapsed_is_now_minus_start() {
        let entry = tracker();
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T08:00:00Z")), 0);
        assert_eq!(
            entry.elapsed_seconds(at("2026-10-15T08:25:30Z")),
            25 * 60 + 30
        );
    }

    #[test]
    fn a_long_gap_between_reads_still_counts_all_of_it() {
        // The laptop slept for eight hours with the timer running. No tick fired, yet the
        // timestamps still give the full wall-clock span.
        let entry = tracker();
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T16:00:00Z")), 8 * 3600);
    }

    #[test]
    fn a_clock_that_moves_back_never_gives_negative_time() {
        let entry = tracker();
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T07:00:00Z")), 0);
    }

    #[test]
    fn pause_freezes_elapsed_and_resume_excludes_the_pause() {
        let mut entry = tracker();
        entry.pause(at("2026-10-15T08:10:00Z")).unwrap();

        // While paused, later reads keep returning the frozen value.
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T08:10:00Z")), 600);
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T09:00:00Z")), 600);

        entry.resume(at("2026-10-15T09:00:00Z")).unwrap();
        assert_eq!(entry.paused_total_sec, 3000);
        assert_eq!(entry.elapsed_seconds(at("2026-10-15T09:05:00Z")), 900);
    }

    #[test]
    fn stopping_while_paused_excludes_the_open_pause() {
        let mut entry = tracker();
        entry.pause(at("2026-10-15T08:10:00Z")).unwrap();
        entry.stop(at("2026-10-15T08:40:00Z")).unwrap();

        assert!(!entry.is_running);
        assert!(!entry.is_paused());
        assert_eq!(entry.ended_at, Some(at("2026-10-15T08:40:00Z")));
        assert_eq!(entry.elapsed_seconds(at("2026-10-16T00:00:00Z")), 600);
    }

    #[test]
    fn a_stopped_entry_keeps_its_elapsed_forever() {
        let mut entry = tracker();
        entry.stop(at("2026-10-15T08:30:00Z")).unwrap();
        assert_eq!(entry.elapsed_seconds(at("2027-01-01T00:00:00Z")), 1800);
    }

    #[test]
    fn invalid_transitions_are_rejected() {
        let mut entry = tracker();
        assert_eq!(
            entry.resume(at("2026-10-15T08:01:00Z")),
            Err(DomainError::TimerNotPaused)
        );
        entry.pause(at("2026-10-15T08:01:00Z")).unwrap();
        assert_eq!(
            entry.pause(at("2026-10-15T08:02:00Z")),
            Err(DomainError::TimerAlreadyPaused)
        );
        entry.stop(at("2026-10-15T08:03:00Z")).unwrap();
        assert_eq!(
            entry.pause(at("2026-10-15T08:04:00Z")),
            Err(DomainError::TimerStopped)
        );
        assert_eq!(
            entry.stop(at("2026-10-15T08:04:00Z")),
            Err(DomainError::TimerStopped)
        );
    }

    #[test]
    fn every_change_bumps_the_revision() {
        let mut entry = tracker();
        entry.pause(at("2026-10-15T08:01:00Z")).unwrap();
        entry.resume(at("2026-10-15T08:02:00Z")).unwrap();
        entry.stop(at("2026-10-15T08:03:00Z")).unwrap();
        assert_eq!(entry.revision, 4);
    }

    #[test]
    fn timebox_needs_a_target_and_counts_down() {
        assert_eq!(
            TimeEntry::start(
                "e".into(),
                input(TimerMode::Timebox, None),
                at("2026-10-15T08:00:00Z")
            ),
            Err(DomainError::TimerTargetRequired)
        );

        let entry = TimeEntry::start(
            "e".into(),
            input(TimerMode::Timebox, Some(30)),
            at("2026-10-15T08:00:00Z"),
        )
        .unwrap();
        assert_eq!(
            entry.remaining_seconds(at("2026-10-15T08:10:00Z")),
            Some(1200)
        );
        assert!(!entry.target_reached(at("2026-10-15T08:29:59Z")));
        assert!(entry.target_reached(at("2026-10-15T08:30:00Z")));
        assert_eq!(entry.remaining_seconds(at("2026-10-15T09:00:00Z")), Some(0));
    }

    #[test]
    fn a_paused_timebox_does_not_run_down() {
        let mut entry = TimeEntry::start(
            "e".into(),
            input(TimerMode::Timebox, Some(30)),
            at("2026-10-15T08:00:00Z"),
        )
        .unwrap();
        entry.pause(at("2026-10-15T08:20:00Z")).unwrap();
        assert!(!entry.target_reached(at("2026-10-15T12:00:00Z")));
        assert_eq!(
            entry.remaining_seconds(at("2026-10-15T12:00:00Z")),
            Some(600)
        );
    }

    #[test]
    fn pomodoro_defaults_to_25_minutes_and_flowtime_has_no_target() {
        let pomodoro = TimeEntry::start(
            "e".into(),
            input(TimerMode::Pomodoro, None),
            at("2026-10-15T08:00:00Z"),
        )
        .unwrap();
        assert_eq!(pomodoro.target_min, Some(25));

        let flow = TimeEntry::start(
            "e".into(),
            input(TimerMode::Flowtime, None),
            at("2026-10-15T08:00:00Z"),
        )
        .unwrap();
        assert_eq!(flow.target_min, None);
        assert_eq!(flow.remaining_seconds(at("2026-10-15T09:00:00Z")), None);
    }

    #[test]
    fn zero_target_is_rejected_and_blank_note_is_dropped() {
        assert_eq!(
            TimeEntry::start(
                "e".into(),
                input(TimerMode::Timebox, Some(0)),
                at("2026-10-15T08:00:00Z")
            ),
            Err(DomainError::InvalidTimerTarget)
        );

        let mut with_note = input(TimerMode::Tracker, None);
        with_note.note = Some("  ".into());
        let entry = TimeEntry::start("e".into(), with_note, at("2026-10-15T08:00:00Z")).unwrap();
        assert_eq!(entry.note, None);
    }

    #[test]
    fn stop_at_ends_at_the_given_moment_and_never_before_the_start() {
        let mut entry = tracker();
        entry
            .stop_at(at("2026-10-15T08:20:00Z"), at("2026-10-15T14:00:00Z"))
            .unwrap();
        assert_eq!(entry.elapsed_seconds(at("2026-10-16T00:00:00Z")), 1200);
        assert!(!entry.is_running);
        assert_eq!(entry.updated_at, at("2026-10-15T14:00:00Z"));

        let mut early = tracker();
        early
            .stop_at(at("2026-10-15T07:00:00Z"), at("2026-10-15T14:00:00Z"))
            .unwrap();
        assert_eq!(early.elapsed_seconds(at("2026-10-16T00:00:00Z")), 0);
    }

    #[test]
    fn discard_hides_the_entry_and_it_cannot_be_discarded_twice() {
        let mut entry = tracker();
        entry.discard(at("2026-10-15T09:00:00Z")).unwrap();
        assert!(!entry.is_running);
        assert_eq!(entry.deleted_at, Some(at("2026-10-15T09:00:00Z")));
        assert_eq!(
            entry.discard(at("2026-10-15T09:01:00Z")),
            Err(DomainError::TimerStopped)
        );
    }

    #[test]
    fn mode_round_trips_through_text() {
        for mode in [
            TimerMode::Tracker,
            TimerMode::Timebox,
            TimerMode::Pomodoro,
            TimerMode::Flowtime,
        ] {
            assert_eq!(TimerMode::parse(mode.as_str()), Some(mode));
        }
        assert_eq!(TimerMode::parse("other"), None);
    }
}
