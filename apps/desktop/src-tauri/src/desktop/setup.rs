use std::path::PathBuf;
use std::sync::Arc;

use tauri::{App, Manager};

use super::state::AppState;
use crate::application::task_service::TaskService;
use crate::infrastructure::clock::SystemClock;
use crate::infrastructure::database;
use crate::infrastructure::repositories::sqlite_task_repository::SqliteTaskRepository;

/// Overrides the data directory for dev, tests and seed scripts. Never point it at the real app data.
pub const DATA_DIR_ENV: &str = "SELF_PLANNER_DATA_DIR";
pub const DATABASE_FILE: &str = "planner.sqlite";

pub fn init(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = resolve_data_dir(app)?;
    std::fs::create_dir_all(&data_dir)?;

    let connection = database::open(&data_dir.join(DATABASE_FILE))?;
    let repository = Arc::new(SqliteTaskRepository::new(connection));
    let tasks = TaskService::new(repository, Arc::new(SystemClock));

    app.manage(AppState { tasks });
    Ok(())
}

fn resolve_data_dir(app: &App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Some(dir) = std::env::var_os(DATA_DIR_ENV) {
        return Ok(PathBuf::from(dir));
    }
    Ok(app.path().app_data_dir()?.join("SelfPlanner"))
}
