-- V4: time entries (S2.1). One entry type serves tracker, timebox, pomodoro and flowtime (ADR 006).
-- Deleting a task keeps its tracked time; the entry just loses the link.

CREATE TABLE time_entries (
  id               TEXT PRIMARY KEY,
  task_id          TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  mode             TEXT NOT NULL DEFAULT 'tracker'
                   CHECK (mode IN ('tracker', 'timebox', 'pomodoro', 'flowtime')),
  started_at       TEXT NOT NULL,
  ended_at         TEXT,
  paused_total_sec INTEGER NOT NULL DEFAULT 0 CHECK (paused_total_sec >= 0),
  paused_at        TEXT,
  target_min       INTEGER CHECK (target_min IS NULL OR target_min > 0),
  is_running       INTEGER NOT NULL DEFAULT 1 CHECK (is_running IN (0, 1)),
  note             TEXT,
  deleted_at       TEXT,
  revision         INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX idx_entries_start ON time_entries(started_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_task ON time_entries(task_id);

-- At most one running timer (a paused timer still counts as running until it is stopped).
CREATE UNIQUE INDEX idx_one_running ON time_entries(is_running) WHERE is_running = 1;
