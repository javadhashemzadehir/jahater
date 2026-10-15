use rusqlite::{params, OptionalExtension};

use super::mappers::label_row::label_from_row;
use super::mappers::task_row::format_timestamp;
use super::queries::labels;
use crate::domain::label::{Label, LabelKind};
use crate::domain::ports::{LabelRepository, RepositoryError};
use crate::infrastructure::database::SharedConnection;

pub struct SqliteLabelRepository {
    connection: SharedConnection,
}

impl SqliteLabelRepository {
    pub fn new(connection: SharedConnection) -> Self {
        Self { connection }
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, rusqlite::Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| RepositoryError::Storage("connection lock poisoned".into()))
    }
}

impl LabelRepository for SqliteLabelRepository {
    fn insert(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                &labels::insert(kind),
                params![
                    label.id,
                    label.name,
                    label.revision,
                    format_timestamp(label.created_at),
                    format_timestamp(label.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn update(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError> {
        self.lock()?
            .execute(
                &labels::update(kind),
                params![
                    label.id,
                    label.name,
                    label.revision,
                    format_timestamp(label.updated_at),
                ],
            )
            .map_err(storage)?;
        Ok(())
    }

    fn delete(&self, kind: LabelKind, id: &str) -> Result<bool, RepositoryError> {
        let removed = self
            .lock()?
            .execute(&labels::delete(kind), params![id])
            .map_err(storage)?;
        Ok(removed > 0)
    }

    fn find(&self, kind: LabelKind, id: &str) -> Result<Option<Label>, RepositoryError> {
        self.lock()?
            .query_row(&labels::find(kind), params![id], label_from_row)
            .optional()
            .map_err(storage)
    }

    fn list(&self, kind: LabelKind) -> Result<Vec<Label>, RepositoryError> {
        let connection = self.lock()?;
        let mut statement = connection.prepare(&labels::list(kind)).map_err(storage)?;
        let rows = statement.query_map([], label_from_row).map_err(storage)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(storage)
    }
}

fn storage(error: rusqlite::Error) -> RepositoryError {
    RepositoryError::Storage(error.to_string())
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;
    use crate::infrastructure::database;

    fn repository() -> SqliteLabelRepository {
        SqliteLabelRepository::new(database::share(database::open_in_memory().unwrap()))
    }

    fn label(id: &str, name: &str) -> Label {
        Label::new(id.into(), name, Utc::now()).unwrap()
    }

    #[test]
    fn projects_and_tags_are_separate_lists() {
        let repository = repository();
        repository
            .insert(LabelKind::Project, &label("p", "Thesis"))
            .unwrap();
        repository
            .insert(LabelKind::Tag, &label("t", "home"))
            .unwrap();

        assert_eq!(repository.list(LabelKind::Project).unwrap().len(), 1);
        assert_eq!(repository.list(LabelKind::Tag).unwrap()[0].name, "home");
    }

    #[test]
    fn rename_and_delete_round_trip() {
        let repository = repository();
        let mut saved = label("p", "Thesis");
        repository.insert(LabelKind::Project, &saved).unwrap();

        saved.rename("Dissertation", Utc::now()).unwrap();
        repository.update(LabelKind::Project, &saved).unwrap();
        let found = repository.find(LabelKind::Project, "p").unwrap().unwrap();
        assert_eq!(found.name, "Dissertation");
        assert_eq!(found.revision, 2);

        assert!(repository.delete(LabelKind::Project, "p").unwrap());
        assert!(!repository.delete(LabelKind::Project, "p").unwrap());
    }

    #[test]
    fn database_rejects_names_that_differ_only_by_case() {
        let repository = repository();
        repository
            .insert(LabelKind::Tag, &label("a", "Home"))
            .unwrap();
        assert!(repository
            .insert(LabelKind::Tag, &label("b", "home"))
            .is_err());
    }
}
