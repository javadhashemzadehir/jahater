use rusqlite::Row;

use super::task_row::parse_timestamp;
use crate::domain::label::Label;

pub fn label_from_row(row: &Row<'_>) -> rusqlite::Result<Label> {
    Ok(Label {
        id: row.get(0)?,
        name: row.get(1)?,
        revision: row.get(2)?,
        created_at: parse_timestamp(row, 3)?,
        updated_at: parse_timestamp(row, 4)?,
    })
}
