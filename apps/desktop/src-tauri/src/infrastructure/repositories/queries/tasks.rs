pub const INSERT_TASK: &str = "
    INSERT INTO tasks (
        id, title, notes, status, is_urgent, is_important, estimate_minutes,
        deleted_at, revision, created_at, updated_at, project_id
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
";

pub const UPDATE_TASK: &str = "
    UPDATE tasks
    SET title = ?2, notes = ?3, status = ?4, is_urgent = ?5, is_important = ?6,
        estimate_minutes = ?7, deleted_at = ?8, revision = ?9, updated_at = ?10,
        project_id = ?11
    WHERE id = ?1
";

// Only trashed rows can be purged. The service checks this first; the guard here is a second line.
pub const PURGE_TASK: &str = "DELETE FROM tasks WHERE id = ?1 AND deleted_at IS NOT NULL";

// Every select below shares one column order, which `mappers::task_row::task_from_row` reads.
pub const FIND_ACTIVE_TASK: &str = "
    SELECT id, title, notes, status, is_urgent, is_important, estimate_minutes,
           deleted_at, revision, created_at, updated_at, project_id
    FROM tasks
    WHERE id = ?1 AND deleted_at IS NULL
";

pub const FIND_TRASHED_TASK: &str = "
    SELECT id, title, notes, status, is_urgent, is_important, estimate_minutes,
           deleted_at, revision, created_at, updated_at, project_id
    FROM tasks
    WHERE id = ?1 AND deleted_at IS NOT NULL
";

pub const SELECT_ACTIVE_TASKS: &str = "
    SELECT id, title, notes, status, is_urgent, is_important, estimate_minutes,
           deleted_at, revision, created_at, updated_at, project_id
    FROM tasks
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id DESC
";

pub const SELECT_TRASHED_TASKS: &str = "
    SELECT id, title, notes, status, is_urgent, is_important, estimate_minutes,
           deleted_at, revision, created_at, updated_at, project_id
    FROM tasks
    WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC, id DESC
";

pub const DELETE_TASK_TAGS: &str = "DELETE FROM task_tags WHERE task_id = ?1";

pub const INSERT_TASK_TAG: &str = "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)";

pub const SELECT_TASK_TAGS: &str =
    "SELECT tag_id FROM task_tags WHERE task_id = ?1 ORDER BY tag_id";

pub const SELECT_ALL_TASK_TAGS: &str = "SELECT task_id, tag_id FROM task_tags ORDER BY tag_id";
