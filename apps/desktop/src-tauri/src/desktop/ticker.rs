use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::state::AppState;
use crate::application::timer_service::TimerView;

pub const TIMER_TICK: &str = "timer://tick";
pub const TIMER_FINISHED: &str = "timer://finished";

/// How often the running timer is marked alive, for crash recovery.
const HEARTBEAT_SECONDS: u64 = 5;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TickPayload {
    pub entry_id: String,
    pub elapsed_seconds: i64,
    pub remaining_seconds: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishedPayload {
    pub entry_id: String,
}

/// What one tick should tell the UI. Pure, so it can be tested without a window.
#[derive(Debug, PartialEq, Eq)]
pub struct TickOutcome {
    pub tick: Option<TickPayload>,
    pub finished: Option<FinishedPayload>,
}

pub fn outcome(view: Option<&TimerView>, last_finished: &mut Option<String>) -> TickOutcome {
    let Some(view) = view else {
        *last_finished = None;
        return TickOutcome {
            tick: None,
            finished: None,
        };
    };

    let id = &view.entry.id;
    // A paused timer does not count down, so it can never newly finish.
    let reached = view.remaining_seconds == Some(0) && !view.entry.is_paused();
    let newly_finished = reached && last_finished.as_deref() != Some(id.as_str());
    if newly_finished {
        *last_finished = Some(id.clone());
    }

    TickOutcome {
        tick: Some(TickPayload {
            entry_id: id.clone(),
            elapsed_seconds: view.elapsed_seconds,
            remaining_seconds: view.remaining_seconds,
        }),
        finished: newly_finished.then(|| FinishedPayload {
            entry_id: id.clone(),
        }),
    }
}

/// Emits `timer://tick` every second while a timer exists, and `timer://finished` once when a
/// target is reached. Ticks are display only: values come from timestamps (ADR 006).
pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last_finished: Option<String> = None;
        let mut seconds: u64 = 0;
        loop {
            thread::sleep(Duration::from_secs(1));
            seconds += 1;
            let state = app.state::<AppState>();
            if seconds.is_multiple_of(HEARTBEAT_SECONDS) {
                // Best effort: a missed beat only makes crash recovery a few seconds coarser.
                let _ = state.timer.heartbeat();
            }
            let view = state.timer.active().ok().flatten();
            let result = outcome(view.as_ref(), &mut last_finished);
            if let Some(tick) = result.tick {
                let _ = app.emit(TIMER_TICK, tick);
            }
            if let Some(finished) = result.finished {
                let _ = app.emit(TIMER_FINISHED, finished);
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::timer::{StartTimer, TimeEntry, TimerMode};

    fn view(target: Option<u32>, elapsed: i64, paused: bool) -> TimerView {
        let start = DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let mut entry = TimeEntry::start(
            "e1".into(),
            StartTimer {
                task_id: None,
                mode: if target.is_some() {
                    TimerMode::Timebox
                } else {
                    TimerMode::Tracker
                },
                target_min: target,
                note: None,
            },
            start,
        )
        .unwrap();
        let now = start + chrono::Duration::seconds(elapsed);
        if paused {
            entry.pause(now).unwrap();
        }
        TimerView {
            elapsed_seconds: entry.elapsed_seconds(now),
            remaining_seconds: entry.remaining_seconds(now),
            entry,
        }
    }

    #[test]
    fn no_timer_means_no_events_and_resets_the_finished_marker() {
        let mut last = Some("old".to_string());
        let result = outcome(None, &mut last);
        assert_eq!(result.tick, None);
        assert_eq!(result.finished, None);
        assert_eq!(last, None);
    }

    #[test]
    fn a_running_timer_ticks_without_finishing() {
        let mut last = None;
        let result = outcome(Some(&view(Some(10), 120, false)), &mut last);
        assert_eq!(result.tick.unwrap().remaining_seconds, Some(480));
        assert_eq!(result.finished, None);
    }

    #[test]
    fn reaching_the_target_finishes_exactly_once() {
        let mut last = None;
        let done = view(Some(10), 601, false);

        let first = outcome(Some(&done), &mut last);
        assert_eq!(first.finished.unwrap().entry_id, "e1");

        let second = outcome(Some(&done), &mut last);
        assert!(second.tick.is_some());
        assert_eq!(second.finished, None);
    }

    #[test]
    fn a_paused_timer_never_finishes() {
        let mut last = None;
        let result = outcome(Some(&view(Some(10), 600, true)), &mut last);
        assert_eq!(result.finished, None);
    }

    #[test]
    fn a_tracker_has_no_target_to_finish() {
        let mut last = None;
        let result = outcome(Some(&view(None, 99999, false)), &mut last);
        assert_eq!(result.finished, None);
    }
}
