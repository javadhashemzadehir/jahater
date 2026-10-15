-- V1: first task table. Later tables (projects, subtasks, tags, time_blocks,
-- time_entries) arrive in their own migrations with the sprint that needs them.
-- Conventions: TEXT ids (UUIDv7), ISO 8601 UTC timestamps, soft delete, revision.

CREATE TABLE tasks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo', 'doing', 'done', 'archived')),
  is_urgent    INTEGER NOT NULL DEFAULT 0 CHECK (is_urgent IN (0, 1)),
  is_important INTEGER NOT NULL DEFAULT 0 CHECK (is_important IN (0, 1)),
  deleted_at   TEXT,
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
