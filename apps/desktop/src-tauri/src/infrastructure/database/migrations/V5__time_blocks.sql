-- V5: planned time blocks on the daily timeline (S2.3). Kinds other than 'task' (buffer,
-- transition, free, event) are used from S3.3. Deleting a task keeps its blocks, unlinked.

CREATE TABLE time_blocks (
  id           TEXT PRIMARY KEY,
  task_id      TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL DEFAULT 'task'
               CHECK (kind IN ('task', 'buffer', 'transition', 'free', 'event')),
  title        TEXT,
  start_at     TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  deleted_at   TEXT,
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX idx_blocks_start ON time_blocks(start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_blocks_task ON time_blocks(task_id);
