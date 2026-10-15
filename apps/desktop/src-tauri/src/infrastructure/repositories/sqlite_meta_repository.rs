use rusqlite::{params, OptionalExtension};

use crate::domain::ports::{MetaRepository, RepositoryError};
use crate::infrastructure::database::SharedConnection;

/// Key/value device preferences in `app_meta`.
pub struct SqliteMetaRepository {
    connection: SharedConnection,
}

impl SqliteMetaRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

impl MetaRepository for SqliteMetaRepository {
    fn get(&self, key: &str) -> Result<Option<String>, RepositoryError> {
        self.lock()?
            .query_row(
                "SELECT value FROM app_meta WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()
            .map_err(storage)
    }

    fn set(&self, key: &str, value: &str) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                "INSERT INTO app_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
            .map_err(storage)?;
        Ok(())
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::database;

    #[test]
    fn missing_key_is_none_and_set_overwrites() {
        let repository =
            SqliteMetaRepository::new(database::share(database::open_in_memory().unwrap()));
        assert_eq!(repository.get("capacity_minutes").unwrap(), None);

        repository.set("capacity_minutes", "300").unwrap();
        repository.set("capacity_minutes", "240").unwrap();
        assert_eq!(
            repository.get("capacity_minutes").unwrap().as_deref(),
            Some("240")
        );
    }
}
