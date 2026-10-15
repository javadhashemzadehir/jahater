use rusqlite::types::Type;
use rusqlite::Row;

use super::task_row::{parse_optional_timestamp, parse_timestamp};
use crate::domain::block::{BlockKind, TimeBlock};

pub fn block_from_row(row: &Row<'_>) -> rusqlite::Result<TimeBlock> {
    let kind_text: String = row.get(2)?;
    let kind = BlockKind::parse(&kind_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            2,
            Type::Text,
            format!("unknown block kind {kind_text}").into(),
        )
    })?;

    Ok(TimeBlock {
        id: row.get(0)?,
        task_id: row.get(1)?,
        kind,
        title: row.get(3)?,
        start_at: parse_timestamp(row, 4)?,
        duration_min: row.get(5)?,
        deleted_at: parse_optional_timestamp(row, 6)?,
        revision: row.get(7)?,
        created_at: parse_timestamp(row, 8)?,
        updated_at: parse_timestamp(row, 9)?,
    })
}
