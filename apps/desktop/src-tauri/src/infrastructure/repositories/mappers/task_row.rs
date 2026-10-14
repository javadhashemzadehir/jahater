use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::types::Type;
use rusqlite::Row;

use crate::domain::task::{Task, TaskStatus};

/// Reads a row selected by `SELECT_ACTIVE_TASKS`. Column indexes follow that query.
pub fn task_from_row(row: &Row<'_>) -> rusqlite::Result<Task> {
    let status_text: String = row.get(2)?;
    let status = TaskStatus::parse(&status_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            2,
            Type::Text,
            format!("unknown status {status_text}").into(),
        )
    })?;

    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        status,
        is_urgent: row.get(3)?,
        is_important: row.get(4)?,
        revision: row.get(5)?,
        created_at: parse_timestamp(row, 6)?,
        updated_at: parse_timestamp(row, 7)?,
    })
}

pub fn format_timestamp(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn parse_timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<DateTime<Utc>> {
    let text: String = row.get(index)?;
    DateTime::parse_from_rfc3339(&text)
        .map(|value| value.with_timezone(&Utc))
        .map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(index, Type::Text, Box::new(error))
        })
}
