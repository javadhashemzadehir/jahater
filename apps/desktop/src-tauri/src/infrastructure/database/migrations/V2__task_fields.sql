-- V2: task notes and estimate (S1.1). Projects, tags and subtasks arrive in S1.2.
-- `deleted_at` and `revision` already exist from V1.

ALTER TABLE tasks ADD COLUMN notes TEXT;
ALTER TABLE tasks ADD COLUMN estimate_minutes INTEGER
  CHECK (estimate_minutes IS NULL OR estimate_minutes > 0);

CREATE INDEX idx_tasks_deleted ON tasks(deleted_at);
