use rusqlite::types::Type;
use rusqlite::{params_from_iter, Row};

use super::task_row::{format_timestamp, parse_optional_timestamp, parse_timestamp};
use crate::domain::timer::{TimeEntry, TimerMode};

pub fn entry_from_row(row: &Row<'_>) -> rusqlite::Result<TimeEntry> {
    let mode_text: String = row.get(2)?;
    let mode = TimerMode::parse(&mode_text).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            2,
            Type::Text,
            format!("unknown mode {mode_text}").into(),
        )
    })?;

    Ok(TimeEntry {
        id: row.get(0)?,
        task_id: row.get(1)?,
        mode,
        started_at: parse_timestamp(row, 3)?,
        ended_at: parse_optional_timestamp(row, 4)?,
        paused_total_sec: row.get(5)?,
        paused_at: parse_optional_timestamp(row, 6)?,
        target_min: row.get(7)?,
        is_running: row.get(8)?,
        note: row.get(9)?,
        deleted_at: parse_optional_timestamp(row, 10)?,
        revision: row.get(11)?,
        created_at: parse_timestamp(row, 12)?,
        updated_at: parse_timestamp(row, 13)?,
        last_seen_at: parse_optional_timestamp(row, 14)?,
    })
}

/// Parameters in the column order of `INSERT_ENTRY` and `UPDATE_ENTRY`.
pub fn entry_params(entry: &TimeEntry) -> Vec<rusqlite::types::Value> {
    use rusqlite::types::Value;

    let text = |value: &str| Value::Text(value.to_owned());
    let optional_text =
        |value: Option<&String>| value.map_or(Value::Null, |v| Value::Text(v.clone()));
    let optional_time = |value: Option<chrono::DateTime<chrono::Utc>>| {
        value.map_or(Value::Null, |v| Value::Text(format_timestamp(v)))
    };

    vec![
        text(&entry.id),
        optional_text(entry.task_id.as_ref()),
        text(entry.mode.as_str()),
        Value::Text(format_timestamp(entry.started_at)),
        optional_time(entry.ended_at),
        Value::Integer(entry.paused_total_sec),
        optional_time(entry.paused_at),
        entry
            .target_min
            .map_or(Value::Null, |v| Value::Integer(i64::from(v))),
        Value::Integer(i64::from(entry.is_running)),
        optional_text(entry.note.as_ref()),
        optional_time(entry.deleted_at),
        Value::Integer(entry.revision),
        Value::Text(format_timestamp(entry.created_at)),
        Value::Text(format_timestamp(entry.updated_at)),
        optional_time(entry.last_seen_at),
    ]
}

pub fn as_params(values: &[rusqlite::types::Value]) -> impl rusqlite::Params + '_ {
    params_from_iter(values.iter())
}
