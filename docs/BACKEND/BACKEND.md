# Self Planner Backend

Offline-first Rust backend hosted inside Tauri 2. Independently testable. No React, Next or UI dependencies in `domain` or `application`.

## Folder map (planned)

```
src-tauri/src/
├── main.rs                 # Desktop entry
├── lib.rs                  # Bootstraps DB, tracing, Tauri commands
├── state.rs                # Shared AppState
├── commands/               # Thin IPC adapters
├── domain/                 # Pure models, ports, timer state machine, errors
├── application/            # Use cases / services
├── infrastructure/         # SQLite, filesystem, autostart, error mapping
│   ├── database/           # Connection, PRAGMAs, migrations/
│   └── repositories/       # queries/, mappers/, helpers/
├── desktop/                # Tray, window, notifications, global shortcuts
└── shared/                 # UUIDv7 ids, time helpers, Clock trait
```

## Data flow

1. Frontend invokes a Tauri command.
2. The command validates the DTO and calls a service.
3. The service applies domain rules.
4. The service persists through repository ports.
5. SQLite adapters run the SQL. Events notify open windows.

```
UI ──IPC──> commands ──> application services ──> domain
                                  │
                                  ▼
                       infrastructure (SQLite / FS)
```

## Repository pattern

- Traits live in `domain/repositories.rs`.
- Implementations live in `infrastructure/repositories/`.
- Domain never imports `rusqlite`.
- No ORM. Queries are SQL constants, rows map to entities by column name, multi-step writes use `Database::with_transaction`.

## Timer engine

The most important backend piece. Rules:

1. **Absolute time.** A running entry stores `started_at` and `paused_total_sec`. Elapsed is always `now - started_at - paused_total_sec`. Sleeping, suspending or crashing cannot corrupt it.
2. **Injected clock.** `domain` depends on a `Clock` trait so tests can control time.
3. **One running entry.** A partial unique index guarantees at most one row with `is_running = 1`. Starting a new timer stops the previous one in the same transaction.
4. **Writes before UI.** Start, pause, resume and stop are persisted immediately. On startup, an unfinished entry is offered to the user: resume, stop at last known time, or discard.
5. **Display ticks only.** Rust emits `timer://tick` every second for display. The frontend computes displayed values from timestamps, so a missed tick never changes the data.
6. **Notifications from Rust.** Timebox end and block start trigger system notifications from the backend, so they work with the window hidden.

Timer modes: `tracker`, `timebox`, `pomodoro`, `flowtime`. A mode is data on the entry (`mode`, `target_min`), not separate machinery.

## Services

| Service | Responsibility |
| --- | --- |
| `TaskService` | CRUD, soft delete, restore, ordering, flag and status changes |
| `ProjectService`, `TagService` | Organisation |
| `PlanningService` | Time blocks, overload check, buffers |
| `TimerService` | Entries, modes, recovery on startup |
| `ReportService` | Estimate vs actual, per-day and per-project aggregates |
| `ReviewService` | Daily review notes |
| `PreferencesService` | Device preferences in `app_meta` |
| `BackupService` | Export, import, rotation |
| `TrashService` | List, restore, permanent delete |

## IPC commands (planned)

Tasks: `create_task`, `get_task`, `list_tasks`, `update_task`, `delete_task`, `restore_task`, `reorder_tasks`  
Subtasks: `add_subtask`, `update_subtask`, `delete_subtask`  
Projects and tags: `create_project`, `list_projects`, `update_project`, `archive_project`, `create_tag`, `list_tags`, `set_task_tags`  
Planning: `create_time_block`, `update_time_block`, `delete_time_block`, `list_time_blocks`, `get_day_load`  
Timer: `start_timer`, `pause_timer`, `resume_timer`, `stop_timer`, `get_active_timer`, `resolve_orphan_timer`  
Reports: `get_estimate_report`, `get_time_report`  
Reviews: `get_daily_review`, `save_daily_review`  
Preferences: `get_app_preferences`, `set_app_preferences`  
Data: `export_data`, `import_data`, `list_trash`, `purge_trash_item`

Command names are `snake_case`. Payloads are validated with Zod on the TypeScript side and again in Rust.

## Events

| Event | Payload | Purpose |
| --- | --- | --- |
| `timer://tick` | `{ entryId, elapsedMs }` | Display refresh |
| `timer://finished` | `{ entryId }` | Timebox reached |
| `tasks://changed` | `{ ids?: string[] }` | Views refetch |
| `tray://action` | `{ action }` | Tray menu to UI intent |
| `capture://open` | none | Global shortcut opened quick capture |

## Errors

`thiserror` enums in `domain/errors.rs`. `infrastructure/error_map.rs` maps them to serializable `{ code, message_key }` objects. The UI turns `message_key` into a localized message. Free-text error strings never reach the user interface.

## Local data layout

Resolved with `directories`. Override with `SELF_PLANNER_DATA_DIR` for dev and screenshots.

```
SelfPlanner/
├── planner.sqlite
└── backups/
    └── YYYY-MM-DD.json
```

## Security

- Minimal Tauri capabilities (`core:default`, dialog open/save, notification, global-shortcut only as needed).
- Strict CSP in `tauri.conf.json`.
- No outbound network code in v0.x.
- No telemetry.
