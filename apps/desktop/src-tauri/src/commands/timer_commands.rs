use serde::{Deserialize, Serialize};
use tauri::State;

use crate::application::timer_service::TimerView;
use crate::desktop::state::AppState;
use crate::domain::timer::{StartTimer, TimerMode};
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartTimerInput {
    #[serde(default)]
    pub task_id: Option<String>,
    pub mode: String,
    #[serde(default)]
    pub target_min: Option<u32>,
    #[serde(default)]
    pub note: Option<String>,
}

/// Timestamps let the UI keep counting between ticks; the seconds are the values at response time.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerDto {
    pub id: String,
    pub task_id: Option<String>,
    pub mode: &'static str,
    pub started_at: String,
    pub paused_total_sec: i64,
    pub paused_at: Option<String>,
    pub target_min: Option<u32>,
    pub is_paused: bool,
    pub note: Option<String>,
    pub elapsed_seconds: i64,
    pub remaining_seconds: Option<i64>,
    pub revision: i64,
    pub ended_at: Option<String>,
}

impl From<TimerView> for TimerDto {
    fn from(view: TimerView) -> Self {
        let entry = view.entry;
        Self {
            is_paused: entry.is_paused(),
            id: entry.id,
            task_id: entry.task_id,
            mode: entry.mode.as_str(),
            started_at: format_timestamp(entry.started_at),
            paused_total_sec: entry.paused_total_sec,
            paused_at: entry.paused_at.map(format_timestamp),
            target_min: entry.target_min,
            note: entry.note,
            elapsed_seconds: view.elapsed_seconds,
            remaining_seconds: view.remaining_seconds,
            revision: entry.revision,
            ended_at: entry.ended_at.map(format_timestamp),
        }
    }
}

#[tauri::command]
pub fn start_timer(
    state: State<'_, AppState>,
    input: StartTimerInput,
) -> Result<TimerDto, CommandError> {
    let mode = TimerMode::parse(&input.mode).ok_or(CommandError {
        code: "VALIDATION_FAILED",
        message_key: "errors.timer.modeInvalid",
    })?;
    state
        .timer
        .start(StartTimer {
            task_id: input.task_id,
            mode,
            target_min: input.target_min,
            note: input.note,
        })
        .map(TimerDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn pause_timer(state: State<'_, AppState>) -> Result<TimerDto, CommandError> {
    state
        .timer
        .pause()
        .map(TimerDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn resume_timer(state: State<'_, AppState>) -> Result<TimerDto, CommandError> {
    state
        .timer
        .resume()
        .map(TimerDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn stop_timer(state: State<'_, AppState>) -> Result<TimerDto, CommandError> {
    state
        .timer
        .stop()
        .map(TimerDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn get_active_timer(state: State<'_, AppState>) -> Result<Option<TimerDto>, CommandError> {
    state
        .timer
        .active()
        .map(|view| view.map(TimerDto::from))
        .map_err(|error| to_command_error(&error))
}
