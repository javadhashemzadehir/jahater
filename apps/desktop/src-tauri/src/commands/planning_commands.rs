use serde::{Deserialize, Deserializer, Serialize};
use tauri::State;

use crate::desktop::state::AppState;
use crate::domain::review::{DailyReview, ReviewPatch};
use crate::domain::settings::{Settings, SettingsPatch};
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsDto {
    pub capacity_minutes: u32,
}

impl From<Settings> for SettingsDto {
    fn from(settings: Settings) -> Self {
        Self {
            capacity_minutes: settings.capacity_minutes,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsInput {
    pub capacity_minutes: Option<u32>,
}

/// Missing key: leave the field. `null`: clear it. A value: set it.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveReviewInput {
    #[serde(default, deserialize_with = "nullable")]
    pub morning_note: Option<Option<String>>,
    #[serde(default, deserialize_with = "nullable")]
    pub evening_note: Option<Option<String>>,
    #[serde(default, deserialize_with = "nullable")]
    pub energy_level: Option<Option<u8>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewDto {
    pub id: String,
    pub day: String,
    pub morning_note: Option<String>,
    pub evening_note: Option<String>,
    pub energy_level: Option<u8>,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DailyReview> for ReviewDto {
    fn from(review: DailyReview) -> Self {
        Self {
            id: review.id,
            day: review.day,
            morning_note: review.morning_note,
            evening_note: review.evening_note,
            energy_level: review.energy_level,
            revision: review.revision,
            created_at: format_timestamp(review.created_at),
            updated_at: format_timestamp(review.updated_at),
        }
    }
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<SettingsDto, CommandError> {
    state
        .settings
        .get()
        .map(SettingsDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    input: UpdateSettingsInput,
) -> Result<SettingsDto, CommandError> {
    state
        .settings
        .update(SettingsPatch {
            capacity_minutes: input.capacity_minutes,
        })
        .map(SettingsDto::from)
        .map_err(|error| to_command_error(&error))
}

/// `day` is the user's local date, `YYYY-MM-DD`. Returns `null` before the first save.
#[tauri::command]
pub fn get_daily_review(
    state: State<'_, AppState>,
    day: String,
) -> Result<Option<ReviewDto>, CommandError> {
    state
        .reviews
        .get(&day)
        .map(|review| review.map(ReviewDto::from))
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn save_daily_review(
    state: State<'_, AppState>,
    day: String,
    input: SaveReviewInput,
) -> Result<ReviewDto, CommandError> {
    state
        .reviews
        .save(
            &day,
            ReviewPatch {
                morning_note: input.morning_note,
                evening_note: input.evening_note,
                energy_level: input.energy_level,
            },
        )
        .map(ReviewDto::from)
        .map_err(|error| to_command_error(&error))
}

fn nullable<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}
