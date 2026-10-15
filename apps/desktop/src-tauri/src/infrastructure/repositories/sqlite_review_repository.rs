use rusqlite::{params, OptionalExtension, Row};

use super::mappers::task_row::{format_timestamp, parse_timestamp};
use crate::domain::ports::{RepositoryError, ReviewRepository};
use crate::domain::review::DailyReview;
use crate::infrastructure::database::SharedConnection;

const SELECT_BY_DAY: &str = "
    SELECT id, day, morning_note, evening_note, energy_level, revision, created_at, updated_at
    FROM daily_reviews
    WHERE day = ?1
";

const INSERT_REVIEW: &str = "
    INSERT INTO daily_reviews (
        id, day, morning_note, evening_note, energy_level, revision, created_at, updated_at
    )
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
";

const UPDATE_REVIEW: &str = "
    UPDATE daily_reviews
    SET morning_note = ?2, evening_note = ?3, energy_level = ?4, revision = ?5, updated_at = ?6
    WHERE id = ?1
";

pub struct SqliteReviewRepository {
    connection: SharedConnection,
}

impl SqliteReviewRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

impl ReviewRepository for SqliteReviewRepository {
    fn find_by_day(&self, day: &str) -> Result<Option<DailyReview>, RepositoryError> {
        self.lock()?
            .query_row(SELECT_BY_DAY, params![day], review_from_row)
            .optional()
            .map_err(storage)
    }

    fn insert(&self, review: &DailyReview) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                INSERT_REVIEW,
                params![
                    review.id,
                    review.day,
                    review.morning_note,
                    review.evening_note,
                    review.energy_level,
                    review.revision,
                    format_timestamp(review.created_at),
                    format_timestamp(review.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn update(&self, review: &DailyReview) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                UPDATE_REVIEW,
                params![
                    review.id,
                    review.morning_note,
                    review.evening_note,
                    review.energy_level,
                    review.revision,
                    format_timestamp(review.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }
}

fn review_from_row(row: &Row<'_>) -> rusqlite::Result<DailyReview> {
    Ok(DailyReview {
        id: row.get(0)?,
        day: row.get(1)?,
        morning_note: row.get(2)?,
        evening_note: row.get(3)?,
        energy_level: row.get(4)?,
        revision: row.get(5)?,
        created_at: parse_timestamp(row, 6)?,
        updated_at: parse_timestamp(row, 7)?,
    })
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Utc};

    use super::*;
    use crate::infrastructure::database;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-10-15T08:00:00.250Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn repository() -> SqliteReviewRepository {
        SqliteReviewRepository::new(database::share(database::open_in_memory().unwrap()))
    }

    #[test]
    fn review_round_trips_and_updates() {
        let repository = repository();
        let mut review = DailyReview::new("r1".into(), "2026-10-15", now()).unwrap();
        review.morning_note = Some("One thing: the report".into());
        review.energy_level = Some(3);
        repository.insert(&review).unwrap();
        assert_eq!(
            repository.find_by_day("2026-10-15").unwrap(),
            Some(review.clone())
        );

        review.evening_note = Some("Done".into());
        review.energy_level = None;
        review.revision = 2;
        repository.update(&review).unwrap();
        assert_eq!(repository.find_by_day("2026-10-15").unwrap(), Some(review));
        assert_eq!(repository.find_by_day("2026-10-16").unwrap(), None);
    }

    #[test]
    fn one_review_per_day() {
        let repository = repository();
        repository
            .insert(&DailyReview::new("a".into(), "2026-10-15", now()).unwrap())
            .unwrap();
        assert!(repository
            .insert(&DailyReview::new("b".into(), "2026-10-15", now()).unwrap())
            .is_err());
    }
}
