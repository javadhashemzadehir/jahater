pub const INSERT_ENTRY: &str = "
    INSERT INTO time_entries (
        id, task_id, mode, started_at, ended_at, paused_total_sec, paused_at, target_min,
        is_running, note, deleted_at, revision, created_at, updated_at, last_seen_at
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
";

pub const UPDATE_ENTRY: &str = "
    UPDATE time_entries
    SET task_id = ?2, mode = ?3, started_at = ?4, ended_at = ?5, paused_total_sec = ?6,
        paused_at = ?7, target_min = ?8, is_running = ?9, note = ?10, deleted_at = ?11,
        revision = ?12, updated_at = ?14, last_seen_at = ?15
    WHERE id = ?1
";

// Both selects share one column order, which `mappers::time_entry_row` reads.
pub const FIND_ENTRY: &str = "
    SELECT id, task_id, mode, started_at, ended_at, paused_total_sec, paused_at, target_min,
           is_running, note, deleted_at, revision, created_at, updated_at, last_seen_at
    FROM time_entries
    WHERE id = ?1
";

pub const FIND_RUNNING_ENTRY: &str = "
    SELECT id, task_id, mode, started_at, ended_at, paused_total_sec, paused_at, target_min,
           is_running, note, deleted_at, revision, created_at, updated_at, last_seen_at
    FROM time_entries
    WHERE is_running = 1 AND deleted_at IS NULL
";

// A paused timer is not alive in the sense that matters here: no time accrues, so there is
// nothing to recover. Only the running (unpaused) entry gets a heartbeat.
pub const TOUCH_RUNNING_ENTRY: &str =
    "UPDATE time_entries SET last_seen_at = ?1 WHERE is_running = 1 AND paused_at IS NULL";
