use chrono::{DateTime, Utc};
use serde::{Deserialize, Deserializer, Serialize};
use tauri::State;

use crate::desktop::state::AppState;
use crate::domain::block::{BlockKind, BlockPatch, NewBlock, TimeBlock};
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlockInput {
    #[serde(default)]
    pub task_id: Option<String>,
    pub kind: String,
    #[serde(default)]
    pub title: Option<String>,
    pub start_at: String,
    pub duration_min: u32,
}

/// Missing key: leave the field. `null`: clear it (task and title only). A value: set it.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBlockInput {
    #[serde(default, deserialize_with = "nullable")]
    pub task_id: Option<Option<String>>,
    #[serde(default, deserialize_with = "nullable")]
    pub title: Option<Option<String>>,
    pub start_at: Option<String>,
    pub duration_min: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlockDto {
    pub id: String,
    pub task_id: Option<String>,
    pub kind: &'static str,
    pub title: Option<String>,
    pub start_at: String,
    pub duration_min: u32,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TimeBlock> for BlockDto {
    fn from(block: TimeBlock) -> Self {
        Self {
            id: block.id,
            task_id: block.task_id,
            kind: block.kind.as_str(),
            title: block.title,
            start_at: format_timestamp(block.start_at),
            duration_min: block.duration_min,
            revision: block.revision,
            created_at: format_timestamp(block.created_at),
            updated_at: format_timestamp(block.updated_at),
        }
    }
}

#[tauri::command]
pub fn create_block(
    state: State<'_, AppState>,
    input: CreateBlockInput,
) -> Result<BlockDto, CommandError> {
    let kind = BlockKind::parse(&input.kind).ok_or(CommandError {
        code: "VALIDATION_FAILED",
        message_key: "errors.block.kindInvalid",
    })?;
    let new_block = NewBlock {
        task_id: input.task_id,
        kind,
        title: input.title,
        start_at: parse_time(&input.start_at)?,
        duration_min: input.duration_min,
    };
    state
        .blocks
        .create_block(new_block)
        .map(BlockDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn update_block(
    state: State<'_, AppState>,
    id: String,
    input: UpdateBlockInput,
) -> Result<BlockDto, CommandError> {
    let patch = BlockPatch {
        task_id: input.task_id,
        title: input.title,
        start_at: input.start_at.as_deref().map(parse_time).transpose()?,
        duration_min: input.duration_min,
    };
    state
        .blocks
        .update_block(&id, patch)
        .map(BlockDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn delete_block(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .blocks
        .delete_block(&id)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn list_blocks(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> Result<Vec<BlockDto>, CommandError> {
    state
        .blocks
        .list_blocks(parse_time(&from)?, parse_time(&to)?)
        .map(|blocks| blocks.into_iter().map(BlockDto::from).collect())
        .map_err(|error| to_command_error(&error))
}

fn parse_time(value: &str) -> Result<DateTime<Utc>, CommandError> {
    DateTime::parse_from_rfc3339(value)
        .map(|time| time.with_timezone(&Utc))
        .map_err(|_| CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.block.timeInvalid",
        })
}

fn nullable<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}
