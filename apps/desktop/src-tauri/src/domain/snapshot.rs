use std::collections::BTreeMap;

use serde_json::{Map, Value};

/// Every table in an export, parents before children. Import inserts in this order and clears
/// in reverse, so foreign keys hold at every step.
pub const TABLE_ORDER: [&str; 8] = [
    "projects",
    "tags",
    "tasks",
    "task_tags",
    "time_entries",
    "time_blocks",
    "daily_reviews",
    "app_meta",
];

pub type Row = Map<String, Value>;

/// A full copy of the user's data, soft-deleted rows included. Rows are plain JSON objects keyed
/// by column name, so the format follows the schema without a second model to keep in sync.
#[derive(Debug, Clone, PartialEq)]
pub struct Snapshot {
    /// Number of the newest migration applied to the database the rows came from.
    pub schema_version: i64,
    pub tables: BTreeMap<String, Vec<Row>>,
}

impl Snapshot {
    pub fn is_known_table(name: &str) -> bool {
        TABLE_ORDER.contains(&name)
    }

    pub fn row_count(&self) -> usize {
        self.tables.values().map(Vec::len).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn knows_its_tables_and_counts_rows() {
        assert!(Snapshot::is_known_table("tasks"));
        assert!(!Snapshot::is_known_table("sqlite_master"));

        let mut tables = BTreeMap::new();
        tables.insert("tasks".to_string(), vec![Row::new(), Row::new()]);
        tables.insert("tags".to_string(), vec![Row::new()]);
        assert_eq!(
            Snapshot {
                schema_version: 7,
                tables
            }
            .row_count(),
            3
        );
    }

    #[test]
    fn parents_come_before_children() {
        let index = |name: &str| TABLE_ORDER.iter().position(|t| *t == name).unwrap();
        assert!(index("projects") < index("tasks"));
        assert!(index("tags") < index("task_tags"));
        assert!(index("tasks") < index("task_tags"));
        assert!(index("tasks") < index("time_entries"));
        assert!(index("tasks") < index("time_blocks"));
    }
}
