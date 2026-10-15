use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension};

use super::mappers::block_row::block_from_row;
use super::mappers::task_row::format_timestamp;
use super::queries::blocks::{
    FIND_ACTIVE_BLOCK, INSERT_BLOCK, SELECT_BLOCKS_STARTING_BETWEEN, UPDATE_BLOCK,
};
use crate::domain::block::TimeBlock;
use crate::domain::ports::{BlockRepository, RepositoryError};
use crate::infrastructure::database::SharedConnection;

pub struct SqliteBlockRepository {
    connection: SharedConnection,
}

impl SqliteBlockRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

impl BlockRepository for SqliteBlockRepository {
    fn insert(&self, block: &TimeBlock) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                INSERT_BLOCK,
                params![
                    block.id,
                    block.task_id,
                    block.kind.as_str(),
                    block.title,
                    format_timestamp(block.start_at),
                    block.duration_min,
                    block.deleted_at.map(format_timestamp),
                    block.revision,
                    format_timestamp(block.created_at),
                    format_timestamp(block.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn update(&self, block: &TimeBlock) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                UPDATE_BLOCK,
                params![
                    block.id,
                    block.task_id,
                    block.kind.as_str(),
                    block.title,
                    format_timestamp(block.start_at),
                    block.duration_min,
                    block.deleted_at.map(format_timestamp),
                    block.revision,
                    format_timestamp(block.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn find_active(&self, id: &str) -> Result<Option<TimeBlock>, RepositoryError> {
        self.lock()?
            .query_row(FIND_ACTIVE_BLOCK, params![id], block_from_row)
            .optional()
            .map_err(storage)
    }

    fn list_starting_between(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<TimeBlock>, RepositoryError> {
        let connection = self.lock()?;
        let mut statement = connection
            .prepare(SELECT_BLOCKS_STARTING_BETWEEN)
            .map_err(storage)?;
        let rows = statement
            .query_map(
                params![format_timestamp(from), format_timestamp(to)],
                block_from_row,
            )
            .map_err(storage)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage)
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::block::{BlockKind, NewBlock};
    use crate::infrastructure::database;

    fn at(text: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(text)
            .unwrap()
            .with_timezone(&Utc)
    }

    fn block(id: &str, start: &str) -> TimeBlock {
        TimeBlock::new(
            id.into(),
            NewBlock {
                task_id: None,
                kind: BlockKind::Buffer,
                title: Some("Break".into()),
                start_at: at(start),
                duration_min: 15,
            },
            at("2026-10-15T07:00:00.125Z"),
        )
        .unwrap()
    }

    fn repository() -> SqliteBlockRepository {
        SqliteBlockRepository::new(database::share(database::open_in_memory().unwrap()))
    }

    #[test]
    fn inserted_block_reads_back_unchanged() {
        let repository = repository();
        let saved = block("a", "2026-10-15T09:00:00.500Z");
        repository.insert(&saved).unwrap();
        assert_eq!(repository.find_active("a").unwrap(), Some(saved));
    }

    #[test]
    fn update_persists_move_resize_and_soft_delete() {
        let repository = repository();
        let mut saved = block("a", "2026-10-15T09:00:00Z");
        repository.insert(&saved).unwrap();

        saved.start_at = at("2026-10-15T10:00:00Z");
        saved.duration_min = 40;
        saved.revision = 2;
        repository.update(&saved).unwrap();
        assert_eq!(repository.find_active("a").unwrap(), Some(saved.clone()));

        saved.delete(at("2026-10-15T11:00:00Z"));
        repository.update(&saved).unwrap();
        assert_eq!(repository.find_active("a").unwrap(), None);
    }

    #[test]
    fn range_query_returns_only_active_blocks_that_start_inside_it() {
        let repository = repository();
        repository
            .insert(&block("early", "2026-10-15T06:00:00Z"))
            .unwrap();
        repository
            .insert(&block("in", "2026-10-15T09:00:00Z"))
            .unwrap();
        repository
            .insert(&block("late", "2026-10-16T09:00:00Z"))
            .unwrap();
        let mut gone = block("gone", "2026-10-15T10:00:00Z");
        gone.delete(at("2026-10-15T10:30:00Z"));
        repository.insert(&gone).unwrap();

        let ids: Vec<String> = repository
            .list_starting_between(at("2026-10-15T08:00:00Z"), at("2026-10-16T00:00:00Z"))
            .unwrap()
            .into_iter()
            .map(|b| b.id)
            .collect();
        assert_eq!(ids, vec!["in"]);
    }
}
