use std::path::Path;

use rusqlite::Connection;

use crate::domain::ports::RepositoryError;

mod embedded {
    refinery::embed_migrations!("src/infrastructure/database/migrations");
}

/// Opens (or creates) the planner database and applies pending migrations.
pub fn open(path: &Path) -> Result<Connection, RepositoryError> {
    let mut connection = Connection::open(path).map_err(storage)?;
    configure(&mut connection)?;
    Ok(connection)
}

pub fn open_in_memory() -> Result<Connection, RepositoryError> {
    let mut connection = Connection::open_in_memory().map_err(storage)?;
    configure(&mut connection)?;
    Ok(connection)
}

fn configure(connection: &mut Connection) -> Result<(), RepositoryError> {
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(storage)?;
    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(storage)?;
    embedded::migrations::runner()
        .run(connection)
        .map_err(storage)?;
    Ok(())
}

fn storage(error: impl std::fmt::Display) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_database_uses_wal() {
        let dir = tempfile::tempdir().unwrap();
        let connection = open(&dir.path().join("planner.sqlite")).unwrap();
        let mode: String = connection
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .unwrap();
        assert_eq!(mode, "wal");
    }

    #[test]
    fn migrations_create_tasks_table() {
        let connection = open_in_memory().unwrap();
        let count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }
}
