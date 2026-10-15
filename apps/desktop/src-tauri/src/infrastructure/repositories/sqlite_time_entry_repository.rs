use rusqlite::{params, OptionalExtension};

use super::mappers::time_entry_row::{as_params, entry_from_row, entry_params};
use super::queries::time_entries::{FIND_ENTRY, FIND_RUNNING_ENTRY, INSERT_ENTRY, UPDATE_ENTRY};
use crate::domain::ports::{RepositoryError, TimeEntryRepository};
use crate::domain::timer::TimeEntry;
use crate::infrastructure::database::SharedConnection;

pub struct SqliteTimeEntryRepository {
    connection: SharedConnection,
}

impl SqliteTimeEntryRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

impl TimeEntryRepository for SqliteTimeEntryRepository {
    fn find_running(&self) -> Result<Option<TimeEntry>, RepositoryError> {
        self.lock()?
            .query_row(FIND_RUNNING_ENTRY, [], entry_from_row)
            .optional()
            .map_err(storage)
    }

    fn find(&self, id: &str) -> Result<Option<TimeEntry>, RepositoryError> {
        self.lock()?
            .query_row(FIND_ENTRY, params![id], entry_from_row)
            .optional()
            .map_err(storage)
    }

    fn replace_running(
        &self,
        stopped: Option<&TimeEntry>,
        started: &TimeEntry,
    ) -> Result<(), RepositoryError> {
        let mut connection = self.lock()?;
        let transaction = connection.transaction().map_err(storage)?;
        // The previous entry must stop first, or the one-running index rejects the new row.
        if let Some(entry) = stopped {
            transaction
                .execute(UPDATE_ENTRY, as_params(&entry_params(entry)))
                .map_err(storage)?;
        }
        transaction
            .execute(INSERT_ENTRY, as_params(&entry_params(started)))
            .map_err(storage)?;
        transaction.commit().map_err(storage)
    }

    fn update(&self, entry: &TimeEntry) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(UPDATE_ENTRY, as_params(&entry_params(entry)))
            .map_err(storage)?;
        Ok(())
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::timer::{StartTimer, TimerMode};
    use crate::infrastructure::database;

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn entry(id: &str, mode: TimerMode, target: Option<u32>, start: &str) -> TimeEntry {
        TimeEntry::start(
            id.into(),
            StartTimer {
                task_id: None,
                mode,
                target_min: target,
                note: Some("focus".into()),
            },
            at(start),
        )
        .unwrap()
    }

    fn repository() -> SqliteTimeEntryRepository {
        SqliteTimeEntryRepository::new(database::share(database::open_in_memory().unwrap()))
    }

    #[test]
    fn started_entry_reads_back_as_the_running_one() {
        let repository = repository();
        let started = entry(
            "a",
            TimerMode::Timebox,
            Some(30),
            "2026-10-15T08:00:00.500Z",
        );
        repository.replace_running(None, &started).unwrap();

        assert_eq!(repository.find_running().unwrap(), Some(started.clone()));
        assert_eq!(repository.find("a").unwrap(), Some(started));
    }

    #[test]
    fn pause_resume_and_stop_persist_every_field() {
        let repository = repository();
        let mut running = entry("a", TimerMode::Tracker, None, "2026-10-15T08:00:00Z");
        repository.replace_running(None, &running).unwrap();

        running.pause(at("2026-10-15T08:10:00Z")).unwrap();
        repository.update(&running).unwrap();
        assert_eq!(repository.find_running().unwrap(), Some(running.clone()));

        running.resume(at("2026-10-15T08:15:00Z")).unwrap();
        running.stop(at("2026-10-15T08:30:00Z")).unwrap();
        repository.update(&running).unwrap();

        assert_eq!(repository.find_running().unwrap(), None);
        assert_eq!(repository.find("a").unwrap(), Some(running));
    }

    #[test]
    fn replacing_stops_the_previous_entry_in_the_same_transaction() {
        let repository = repository();
        let mut first = entry("a", TimerMode::Tracker, None, "2026-10-15T08:00:00Z");
        repository.replace_running(None, &first).unwrap();

        first.stop(at("2026-10-15T08:20:00Z")).unwrap();
        let second = entry("b", TimerMode::Flowtime, None, "2026-10-15T08:20:00Z");
        repository.replace_running(Some(&first), &second).unwrap();

        assert_eq!(repository.find_running().unwrap(), Some(second));
        assert!(!repository.find("a").unwrap().unwrap().is_running);
    }

    #[test]
    fn the_database_allows_only_one_running_entry() {
        let repository = repository();
        repository
            .replace_running(
                None,
                &entry("a", TimerMode::Tracker, None, "2026-10-15T08:00:00Z"),
            )
            .unwrap();

        let second = entry("b", TimerMode::Tracker, None, "2026-10-15T09:00:00Z");
        assert!(repository.replace_running(None, &second).is_err());
        assert!(repository.find("b").unwrap().is_none());
    }
}
