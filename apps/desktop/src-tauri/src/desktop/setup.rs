use std::path::PathBuf;
use std::sync::Arc;

use tauri::{App, Manager};

use super::events::TauriChangeNotifier;
use super::state::AppState;
use crate::application::block_service::BlockService;
use crate::application::label_service::LabelService;
use crate::application::task_service::TaskService;
use crate::application::timer_service::TimerService;
use crate::infrastructure::clock::SystemClock;
use crate::infrastructure::database;
use crate::infrastructure::repositories::sqlite_block_repository::SqliteBlockRepository;
use crate::infrastructure::repositories::sqlite_label_repository::SqliteLabelRepository;
use crate::infrastructure::repositories::sqlite_task_repository::SqliteTaskRepository;
use crate::infrastructure::repositories::sqlite_time_entry_repository::SqliteTimeEntryRepository;

/// Overrides the data directory for dev, tests and seed scripts. Never point it at the real app data.
pub const DATA_DIR_ENV: &str = "SELF_PLANNER_DATA_DIR";
pub const DATABASE_FILE: &str = "planner.sqlite";

pub fn init(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = resolve_data_dir(app)?;
    std::fs::create_dir_all(&data_dir)?;

    let connection = database::share(database::open(&data_dir.join(DATABASE_FILE))?);
    let tasks_repository = Arc::new(SqliteTaskRepository::new(connection.clone()));
    let blocks_repository = Arc::new(SqliteBlockRepository::new(connection.clone()));
    let entries_repository = Arc::new(SqliteTimeEntryRepository::new(connection.clone()));
    let labels_repository = Arc::new(SqliteLabelRepository::new(connection));
    let notifier = Arc::new(TauriChangeNotifier::new(app.handle().clone()));
    let clock = Arc::new(SystemClock);
    let tasks = TaskService::new(
        tasks_repository.clone(),
        labels_repository.clone(),
        clock.clone(),
        notifier.clone(),
    );
    let labels = LabelService::new(labels_repository, clock.clone(), notifier.clone());
    let timer = TimerService::new(
        entries_repository,
        tasks_repository.clone(),
        clock.clone(),
        notifier.clone(),
    );
    let blocks = BlockService::new(blocks_repository, tasks_repository, clock, notifier);

    // Must run before the ticker starts: its heartbeat would hide when the timer was last seen.
    timer.detect_orphan()?;

    app.manage(AppState {
        tasks,
        labels,
        timer,
        blocks,
    });
    super::ticker::spawn(app.handle().clone());
    Ok(())
}

fn resolve_data_dir(app: &App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Some(dir) = std::env::var_os(DATA_DIR_ENV) {
        return Ok(PathBuf::from(dir));
    }
    Ok(app.path().app_data_dir()?.join("SelfPlanner"))
}
