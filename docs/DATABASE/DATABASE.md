# Database & local storage

## Principles

- **Local-first.** All tasks, blocks and time entries stay on the device.
- **User-owned.** Export and import are explicit and user-driven.
- **No cloud database.**
- **Boring SQL.** `rusqlite` (bundled) with `refinery` migrations. No ORM.

## Conventions

- Ids: UUIDv7 stored as `TEXT`.
- Timestamps: ISO 8601 UTC `TEXT`.
- Soft delete: `deleted_at` is `NULL` for live rows. Normal queries exclude deleted rows; Trash and export may include them.
- `revision INTEGER NOT NULL DEFAULT 1`, incremented on every update, kept for possible future sync.
- Every table has `created_at` and `updated_at`.
- Pragmas on open: `foreign_keys = ON`, `journal_mode = WAL`.

## Layout

```
{app_data}/SelfPlanner/
├── planner.sqlite
└── backups/YYYY-MM-DD.json
```

`SELF_PLANNER_DATA_DIR` overrides the base path (dev, tests, doc screenshots). Seed and screenshot scripts must never touch the real app-data directory.

JabeX uses multiple local profiles. Self Planner starts with a single profile. If profiles are added later, the layout can follow JabeX (`app.sqlite` registry plus `profiles/{uuid}/`).

## Migrations

- `V1__create_tasks.sql` (S0.3) creates only the `tasks` table.
- `V2__task_fields.sql` (S1.1) adds `tasks.notes` and `tasks.estimate_minutes`, plus an index on `deleted_at`.
- `V3__projects_and_tags.sql` (S1.2) adds `projects`, `tags`, `task_tags` and `tasks.project_id`. Names are unique ignoring case. Projects and tags are hard-deleted: `project_id` is set to `NULL` and `task_tags` rows cascade, so tasks are never lost. Colour, archive and soft delete for labels are deferred.
- `V4__time_entries.sql` (S2.1) adds `time_entries` and the one-running-entry index. Deleting a task keeps its entries (`task_id` becomes `NULL`).
- `V5__time_blocks.sql` (S2.3) adds `time_blocks`. Blocks are soft-deleted; deleting a task keeps its blocks, unlinked.
- `V6__timer_last_seen.sql` (S2.4) adds `time_entries.last_seen_at`, a heartbeat for crash recovery that does not bump `revision`.
- Other tables below ship in the migration of the sprint that needs them (for example `projects` in S1.2, `time_blocks` and `time_entries` in Phase 2).
- Released migrations are immutable. Changes go into a new `V{n}__name.sql`.

## Schema (draft, full target)

```sql
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT,
  archived_at TEXT,
  deleted_at  TEXT,
  revision    INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tasks (
  id               TEXT PRIMARY KEY,
  project_id       TEXT REFERENCES projects(id),
  title            TEXT NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'todo'
                   CHECK (status IN ('todo','doing','done','archived')),
  is_urgent        INTEGER NOT NULL DEFAULT 0 CHECK (is_urgent IN (0,1)),
  is_important     INTEGER NOT NULL DEFAULT 0 CHECK (is_important IN (0,1)),
  estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes > 0),
  due_at           TEXT,
  sort_order       REAL NOT NULL DEFAULT 0,
  recurrence_rule  TEXT,
  completed_at     TEXT,
  deleted_at       TEXT,
  revision         INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE subtasks (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id),
  title      TEXT NOT NULL,
  is_done    INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0,1)),
  sort_order REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  revision   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT,
  deleted_at TEXT,
  revision   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE task_tags (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  tag_id  TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (task_id, tag_id)
);

-- Planned placement on the timeline (time blocking)
CREATE TABLE time_blocks (
  id           TEXT PRIMARY KEY,
  task_id      TEXT REFERENCES tasks(id),
  kind         TEXT NOT NULL DEFAULT 'task'
               CHECK (kind IN ('task','buffer','transition','free','event')),
  title        TEXT,
  start_at     TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  deleted_at   TEXT,
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- Actual time (tracking), optionally with a target (timeboxing)
CREATE TABLE time_entries (
  id               TEXT PRIMARY KEY,
  task_id          TEXT REFERENCES tasks(id),
  mode             TEXT NOT NULL DEFAULT 'tracker'
                   CHECK (mode IN ('tracker','timebox','pomodoro','flowtime')),
  started_at       TEXT NOT NULL,
  ended_at         TEXT,
  paused_total_sec INTEGER NOT NULL DEFAULT 0,
  paused_at        TEXT,
  target_min       INTEGER CHECK (target_min IS NULL OR target_min > 0),
  is_running       INTEGER NOT NULL DEFAULT 1 CHECK (is_running IN (0,1)),
  note             TEXT,
  deleted_at       TEXT,
  revision         INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE task_events (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id),
  type       TEXT NOT NULL,
  payload    TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE daily_reviews (
  id           TEXT PRIMARY KEY,
  day          TEXT NOT NULL UNIQUE,  -- local date, YYYY-MM-DD, Gregorian
  morning_note TEXT,
  evening_note TEXT,
  energy_level INTEGER CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5),
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX idx_tasks_status   ON tasks(status)   WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due      ON tasks(due_at)   WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_start   ON time_blocks(start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_start  ON time_entries(started_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_task   ON time_entries(task_id);

-- At most one running timer
CREATE UNIQUE INDEX idx_one_running ON time_entries(is_running) WHERE is_running = 1;
```

Notes:

- `is_running` is set to `0` when `ended_at` is set. Both change in one transaction.
- `app_meta` holds device preferences as JSON (capacity per day, week start, shortcuts, tray). Locale and theme are stored by the frontend in `localStorage`, same as JabeX.
- The `day` in `daily_reviews` is the user's local date. A configurable `day_start_hour` (default 0) lets night owls treat 01:00 as the previous day.

## Mapping views to data

| View | Source | Edit by drag |
| --- | --- | --- |
| List | `tasks` ordered by `sort_order` | `sort_order` |
| Kanban | `tasks.status` | `status` |
| Matrix | `tasks.is_urgent`, `tasks.is_important` | both flags |
| Timeline | `time_blocks`, `time_entries` | `start_at`, `duration_min` |

Eisenhower quadrants:

| | Urgent | Not urgent |
| --- | --- | --- |
| **Important** | Do now | Schedule |
| **Not important** | Delegate or shrink | Drop |

## Sample report query

```sql
SELECT t.id, t.title, t.estimate_minutes,
       SUM((julianday(e.ended_at) - julianday(e.started_at)) * 1440.0
           - e.paused_total_sec / 60.0) AS actual_minutes
FROM tasks t
JOIN time_entries e ON e.task_id = t.id
WHERE e.ended_at IS NOT NULL
  AND e.deleted_at IS NULL
  AND e.started_at >= :from AND e.started_at < :to
GROUP BY t.id;
```

## Migrations

- Versioned SQL in `infrastructure/database/migrations/V{n}__name.sql`, embedded by `refinery` at build time.
- Released migrations are immutable. Fix forward with a new migration.
- Back up the database file before applying pending migrations.

## Backup and export

- Automatic daily JSON export with the last N kept.
- Manual export and import through native dialogs (`tauri-plugin-dialog`).
- Export is normalised JSON including soft-deleted rows, versioned with a `format_version` field.
- Import validates schema and rejects unknown versions.

## Open questions

- Retention for `task_events`.
- Whether recurring tasks generate the next instance on completion or are computed on read. Current preference: generate on completion.
- Whether SQLite FTS5 search (as in JabeX) is worth adding for the task list.
