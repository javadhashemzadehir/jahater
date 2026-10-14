pub const INSERT_TASK: &str = "
    INSERT INTO tasks (id, title, status, is_urgent, is_important, revision, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
";

// Column order must match `mappers::task_row::task_from_row`.
pub const SELECT_ACTIVE_TASKS: &str = "
    SELECT id, title, status, is_urgent, is_important, revision, created_at, updated_at
    FROM tasks
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
";
