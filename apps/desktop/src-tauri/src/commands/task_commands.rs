use serde::{Deserialize, Deserializer, Serialize};
use tauri::State;

use crate::desktop::state::AppState;
use crate::domain::task::{NewTask, Task, TaskPatch, TaskStatus};
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub is_urgent: bool,
    #[serde(default)]
    pub is_important: bool,
    #[serde(default)]
    pub estimate_minutes: Option<u32>,
    #[serde(default)]
    pub project_id: Option<String>,
    #[serde(default)]
    pub tag_ids: Vec<String>,
}

/// Missing key: leave the field. `null`: clear it. A value: set it.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    #[serde(default, deserialize_with = "nullable")]
    pub notes: Option<Option<String>>,
    pub status: Option<String>,
    pub is_urgent: Option<bool>,
    pub is_important: Option<bool>,
    #[serde(default, deserialize_with = "nullable")]
    pub estimate_minutes: Option<Option<u32>>,
    #[serde(default, deserialize_with = "nullable")]
    pub project_id: Option<Option<String>>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub status: &'static str,
    pub is_urgent: bool,
    pub is_important: bool,
    pub estimate_minutes: Option<u32>,
    pub project_id: Option<String>,
    pub tag_ids: Vec<String>,
    pub deleted_at: Option<String>,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Task> for TaskDto {
    fn from(task: Task) -> Self {
        Self {
            id: task.id,
            title: task.title,
            notes: task.notes,
            status: task.status.as_str(),
            is_urgent: task.is_urgent,
            is_important: task.is_important,
            estimate_minutes: task.estimate_minutes,
            project_id: task.project_id,
            tag_ids: task.tag_ids,
            deleted_at: task.deleted_at.map(format_timestamp),
            revision: task.revision,
            created_at: format_timestamp(task.created_at),
            updated_at: format_timestamp(task.updated_at),
        }
    }
}

#[tauri::command]
pub fn create_task(
    state: State<'_, AppState>,
    input: CreateTaskInput,
) -> Result<TaskDto, CommandError> {
    let new_task = NewTask {
        title: input.title,
        notes: input.notes,
        is_urgent: input.is_urgent,
        is_important: input.is_important,
        estimate_minutes: input.estimate_minutes,
        project_id: input.project_id,
        tag_ids: input.tag_ids,
    };
    state
        .tasks
        .create_task(new_task)
        .map(TaskDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn update_task(
    state: State<'_, AppState>,
    id: String,
    input: UpdateTaskInput,
) -> Result<TaskDto, CommandError> {
    let patch = into_patch(input)?;
    state
        .tasks
        .update_task(&id, patch)
        .map(TaskDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn trash_task(state: State<'_, AppState>, id: String) -> Result<TaskDto, CommandError> {
    state
        .tasks
        .trash_task(&id)
        .map(TaskDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn restore_task(state: State<'_, AppState>, id: String) -> Result<TaskDto, CommandError> {
    state
        .tasks
        .restore_task(&id)
        .map(TaskDto::from)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn purge_task(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    state
        .tasks
        .purge_task(&id)
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn list_tasks(state: State<'_, AppState>) -> Result<Vec<TaskDto>, CommandError> {
    state
        .tasks
        .list_tasks()
        .map(|tasks| tasks.into_iter().map(TaskDto::from).collect())
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn list_trashed_tasks(state: State<'_, AppState>) -> Result<Vec<TaskDto>, CommandError> {
    state
        .tasks
        .list_trash()
        .map(|tasks| tasks.into_iter().map(TaskDto::from).collect())
        .map_err(|error| to_command_error(&error))
}

fn into_patch(input: UpdateTaskInput) -> Result<TaskPatch, CommandError> {
    let status = input
        .status
        .as_deref()
        .map(|value| {
            TaskStatus::parse(value).ok_or(CommandError {
                code: "VALIDATION_FAILED",
                message_key: "errors.task.statusInvalid",
            })
        })
        .transpose()?;

    Ok(TaskPatch {
        title: input.title,
        notes: input.notes,
        status,
        is_urgent: input.is_urgent,
        is_important: input.is_important,
        estimate_minutes: input.estimate_minutes,
        project_id: input.project_id,
        tag_ids: input.tag_ids,
    })
}

fn nullable<'de, T, D>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}
