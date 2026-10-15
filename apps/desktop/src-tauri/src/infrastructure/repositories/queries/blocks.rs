pub const INSERT_BLOCK: &str = "
    INSERT INTO time_blocks (
        id, task_id, kind, title, start_at, duration_min, deleted_at, revision, created_at, updated_at
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
";

pub const UPDATE_BLOCK: &str = "
    UPDATE time_blocks
    SET task_id = ?2, kind = ?3, title = ?4, start_at = ?5, duration_min = ?6,
        deleted_at = ?7, revision = ?8, updated_at = ?9
    WHERE id = ?1
";

// Both selects share one column order, which `mappers::block_row::block_from_row` reads.
pub const FIND_ACTIVE_BLOCK: &str = "
    SELECT id, task_id, kind, title, start_at, duration_min, deleted_at, revision, created_at, updated_at
    FROM time_blocks
    WHERE id = ?1 AND deleted_at IS NULL
";

// Timestamps are stored in one fixed format, so text comparison orders them correctly.
pub const SELECT_BLOCKS_STARTING_BETWEEN: &str = "
    SELECT id, task_id, kind, title, start_at, duration_min, deleted_at, revision, created_at, updated_at
    FROM time_blocks
    WHERE deleted_at IS NULL AND start_at > ?1 AND start_at < ?2
    ORDER BY start_at, id
";
