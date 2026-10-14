use serde::{Deserialize, Serialize};
use tauri::State;

use crate::desktop::state::AppState;
use crate::domain::task::Task;
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDto {
    pub id: String,
    pub title: String,
    pub status: &'static str,
    pub is_urgent: bool,
    pub is_important: bool,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Task> for TaskDto {
    fn from(task: Task) -> Self {
        Self {
            id: task.id,
            title: task.title,
            status: task.status.as_str(),
            is_urgent: task.is_urgent,
            is_important: task.is_important,
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
    state
        .tasks
        .create_task(&input.title)
        .map(TaskDto::from)
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
