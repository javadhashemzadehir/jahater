use chrono::{DateTime, Utc};

use super::errors::DomainError;

/// Projects and tags are both plain named labels, so they share one model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LabelKind {
    Project,
    Tag,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Label {
    pub id: String,
    pub name: String,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Label {
    pub fn new(id: String, name: &str, now: DateTime<Utc>) -> Result<Self, DomainError> {
        Ok(Self {
            id,
            name: normalize_name(name)?,
            revision: 1,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn rename(&mut self, name: &str, now: DateTime<Utc>) -> Result<(), DomainError> {
        self.name = normalize_name(name)?;
        self.revision += 1;
        self.updated_at = now;
        Ok(())
    }
}

fn normalize_name(value: &str) -> Result<String, DomainError> {
    let name = value.trim();
    if name.is_empty() {
        return Err(DomainError::EmptyName);
    }
    Ok(name.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn trims_name_and_rejects_blank() {
        assert_eq!(
            Label::new("1".into(), "  Work ", now()).unwrap().name,
            "Work"
        );
        assert_eq!(
            Label::new("1".into(), "  ", now()),
            Err(DomainError::EmptyName)
        );
    }

    #[test]
    fn rename_bumps_revision() {
        let mut label = Label::new("1".into(), "Work", now()).unwrap();
        label.rename("Home", now()).unwrap();
        assert_eq!(label.name, "Home");
        assert_eq!(label.revision, 2);
    }
}
