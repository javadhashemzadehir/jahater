use serde::Serialize;
use tauri::State;

use crate::desktop::state::AppState;
use crate::domain::label::{Label, LabelKind};
use crate::infrastructure::error_map::to_command_error;
use crate::infrastructure::repositories::mappers::task_row::format_timestamp;
use crate::shared::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LabelDto {
    pub id: String,
    pub name: String,
    pub revision: i64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Label> for LabelDto {
    fn from(label: Label) -> Self {
        Self {
            id: label.id,
            name: label.name,
            revision: label.revision,
            created_at: format_timestamp(label.created_at),
            updated_at: format_timestamp(label.updated_at),
        }
    }
}

fn create(state: &AppState, kind: LabelKind, name: &str) -> Result<LabelDto, CommandError> {
    state
        .labels
        .create(kind, name)
        .map(LabelDto::from)
        .map_err(|error| to_command_error(&error))
}

fn rename(
    state: &AppState,
    kind: LabelKind,
    id: &str,
    name: &str,
) -> Result<LabelDto, CommandError> {
    state
        .labels
        .rename(kind, id, name)
        .map(LabelDto::from)
        .map_err(|error| to_command_error(&error))
}

fn delete(state: &AppState, kind: LabelKind, id: &str) -> Result<(), CommandError> {
    state
        .labels
        .delete(kind, id)
        .map_err(|error| to_command_error(&error))
}

fn list(state: &AppState, kind: LabelKind) -> Result<Vec<LabelDto>, CommandError> {
    state
        .labels
        .list(kind)
        .map(|labels| labels.into_iter().map(LabelDto::from).collect())
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn create_project(state: State<'_, AppState>, name: String) -> Result<LabelDto, CommandError> {
    create(&state, LabelKind::Project, &name)
}

#[tauri::command]
pub fn rename_project(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<LabelDto, CommandError> {
    rename(&state, LabelKind::Project, &id, &name)
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    delete(&state, LabelKind::Project, &id)
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<LabelDto>, CommandError> {
    list(&state, LabelKind::Project)
}

#[tauri::command]
pub fn create_tag(state: State<'_, AppState>, name: String) -> Result<LabelDto, CommandError> {
    create(&state, LabelKind::Tag, &name)
}

#[tauri::command]
pub fn rename_tag(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<LabelDto, CommandError> {
    rename(&state, LabelKind::Tag, &id, &name)
}

#[tauri::command]
pub fn delete_tag(state: State<'_, AppState>, id: String) -> Result<(), CommandError> {
    delete(&state, LabelKind::Tag, &id)
}

#[tauri::command]
pub fn list_tags(state: State<'_, AppState>) -> Result<Vec<LabelDto>, CommandError> {
    list(&state, LabelKind::Tag)
}
