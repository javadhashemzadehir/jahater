pub mod application;
pub mod commands;
pub mod desktop;
pub mod domain;
pub mod infrastructure;
pub mod shared;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| desktop::setup::init(app))
        .invoke_handler(tauri::generate_handler![
            commands::task_commands::create_task,
            commands::task_commands::update_task,
            commands::task_commands::trash_task,
            commands::task_commands::restore_task,
            commands::task_commands::purge_task,
            commands::task_commands::list_tasks,
            commands::task_commands::list_trashed_tasks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Self Planner");
}
