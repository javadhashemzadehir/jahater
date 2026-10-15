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
            commands::label_commands::create_project,
            commands::label_commands::rename_project,
            commands::label_commands::delete_project,
            commands::label_commands::list_projects,
            commands::label_commands::create_tag,
            commands::label_commands::rename_tag,
            commands::label_commands::delete_tag,
            commands::label_commands::list_tags,
            commands::timer_commands::start_timer,
            commands::timer_commands::pause_timer,
            commands::timer_commands::resume_timer,
            commands::timer_commands::stop_timer,
            commands::timer_commands::get_active_timer,
            commands::timer_commands::get_orphan_timer,
            commands::timer_commands::resolve_orphan_timer,
            commands::block_commands::create_block,
            commands::block_commands::update_block,
            commands::block_commands::delete_block,
            commands::block_commands::list_blocks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Self Planner");
}
