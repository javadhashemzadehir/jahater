use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::types::Type;
use rusqlite::Row;

use crate::domain::task::{Task, TaskStatus};

/// Reads a row selected by one of the task queries. Column indexes follow the shared column order.
pub fn task_from_row(row: &Row<'_>) -> rusqlite::Result<Task> {
    let status_text: String = row.get(3)?;
    let status = TaskStatus::parse(&status_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            3,
            Type::Text,
            format!("unknown status {status_text}").into(),
        )
    })?;

    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        notes: row.get(2)?,
        status,
        is_urgent: row.get(4)?,
        is_important: row.get(5)?,
        estimate_minutes: row.get(6)?,
        deleted_at: parse_optional_timestamp(row, 7)?,
        revision: row.get(8)?,
        created_at: parse_timestamp(row, 9)?,
        updated_at: parse_timestamp(row, 10)?,
    })
}

pub fn format_timestamp(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn parse_timestamp(row: &Row<'_>, index: usize) -> rusqlite::Result<DateTime<Utc>> {
    let text: String = row.get(index)?;
    parse_text(&text, index)
}

fn parse_optional_timestamp(
    row: &Row<'_>,
    index: usize,
) -> rusqlite::Result<Option<DateTime<Utc>>> {
    let text: Option<String> = row.get(index)?;
    text.map(|value| parse_text(&value, index)).transpose()
}

fn parse_text(text: &str, index: usize) -> rusqlite::Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(text)
        .map(|value| value.with_timezone(&Utc))
        .map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(index, Type::Text, Box::new(error))
        })
}
