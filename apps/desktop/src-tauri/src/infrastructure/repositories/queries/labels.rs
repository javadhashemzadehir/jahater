use crate::domain::label::LabelKind;

// Table names come from this closed enum, never from user input.
fn table(kind: LabelKind) -> &'static str {
    match kind {
        LabelKind::Project => "projects",
        LabelKind::Tag => "tags",
    }
}

pub fn insert(kind: LabelKind) -> String {
    format!(
        "INSERT INTO {} (id, name, revision, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        table(kind)
    )
}

pub fn update(kind: LabelKind) -> String {
    format!(
        "UPDATE {} SET name = ?2, revision = ?3, updated_at = ?4 WHERE id = ?1",
        table(kind)
    )
}

pub fn delete(kind: LabelKind) -> String {
    format!("DELETE FROM {} WHERE id = ?1", table(kind))
}

// Both selects share one column order, which `mappers::label_row::label_from_row` reads.
pub fn find(kind: LabelKind) -> String {
    format!(
        "SELECT id, name, revision, created_at, updated_at FROM {} WHERE id = ?1",
        table(kind)
    )
}

pub fn list(kind: LabelKind) -> String {
    format!(
        "SELECT id, name, revision, created_at, updated_at FROM {} ORDER BY name COLLATE NOCASE, id",
        table(kind)
    )
}
