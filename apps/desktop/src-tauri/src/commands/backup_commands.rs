use serde::Serialize;
use tauri::State;

use crate::application::backup_service::ImportSummary;
use crate::desktop::state::AppState;
use crate::infrastructure::error_map::to_command_error;
use crate::shared::error::CommandError;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummaryDto {
    pub rows: usize,
    pub safety_backup: String,
}

impl From<ImportSummary> for ImportSummaryDto {
    fn from(summary: ImportSummary) -> Self {
        Self {
            rows: summary.rows,
            safety_backup: summary.safety_backup,
        }
    }
}

/// Writes a full export into the app's exports folder and returns where it is.
#[tauri::command]
pub fn export_data(state: State<'_, AppState>) -> Result<String, CommandError> {
    state
        .backup
        .export_to_file()
        .map_err(|error| to_command_error(&error))
}

/// Replaces all data with the contents of an export file. A safety copy is taken first.
#[tauri::command]
pub fn import_data(
    state: State<'_, AppState>,
    json: String,
) -> Result<ImportSummaryDto, CommandError> {
    state
        .backup
        .import_json(&json)
        .map(ImportSummaryDto::from)
        .map_err(|error| to_command_error(&error))
}

/// Backup file names, newest first.
#[tauri::command]
pub fn list_backups(state: State<'_, AppState>) -> Result<Vec<String>, CommandError> {
    state
        .backup
        .list_backups()
        .map_err(|error| to_command_error(&error))
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    name: String,
) -> Result<ImportSummaryDto, CommandError> {
    state
        .backup
        .restore_backup(&name)
        .map(ImportSummaryDto::from)
        .map_err(|error| to_command_error(&error))
}
