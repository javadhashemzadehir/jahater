use std::sync::Arc;

use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::label::{Label, LabelKind};
use crate::domain::ports::{ChangeNotifier, Clock, LabelRepository};

/// Projects and tags: create, rename, delete, list. Names are unique per kind, ignoring case.
pub struct LabelService {
    repository: Arc<dyn LabelRepository>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
}

impl LabelService {
    pub fn new(
        repository: Arc<dyn LabelRepository>,
        clock: Arc<dyn Clock>,
        notifier: Arc<dyn ChangeNotifier>,
    ) -> Self {
        Self {
            repository,
            clock,
            notifier,
        }
    }

    pub fn create(&self, kind: LabelKind, name: &str) -> Result<Label, ApplicationError> {
        let label = Label::new(Uuid::now_v7().to_string(), name, self.clock.now())?;
        self.ensure_unique(kind, &label.name, None)?;
        self.repository.insert(kind, &label)?;
        self.notifier.tasks_changed();
        Ok(label)
    }

    pub fn rename(&self, kind: LabelKind, id: &str, name: &str) -> Result<Label, ApplicationError> {
        let mut label = self
            .repository
            .find(kind, id)?
            .ok_or(ApplicationError::LabelNotFound)?;
        label.rename(name, self.clock.now())?;
        self.ensure_unique(kind, &label.name, Some(id))?;
        self.repository.update(kind, &label)?;
        self.notifier.tasks_changed();
        Ok(label)
    }

    pub fn delete(&self, kind: LabelKind, id: &str) -> Result<(), ApplicationError> {
        if !self.repository.delete(kind, id)? {
            return Err(ApplicationError::LabelNotFound);
        }
        self.notifier.tasks_changed();
        Ok(())
    }

    pub fn list(&self, kind: LabelKind) -> Result<Vec<Label>, ApplicationError> {
        Ok(self.repository.list(kind)?)
    }

    fn ensure_unique(
        &self,
        kind: LabelKind,
        name: &str,
        own_id: Option<&str>,
    ) -> Result<(), ApplicationError> {
        let wanted = name.to_lowercase();
        let taken =
            self.repository.list(kind)?.iter().any(|other| {
                Some(other.id.as_str()) != own_id && other.name.to_lowercase() == wanted
            });
        if taken {
            return Err(ApplicationError::DuplicateLabel);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::test_support::{CountingNotifier, FixedClock, MemoryLabels};
    use crate::domain::errors::DomainError;

    fn service() -> (LabelService, Arc<CountingNotifier>) {
        let notifier = Arc::new(CountingNotifier::default());
        let service = LabelService::new(
            Arc::new(MemoryLabels::default()),
            Arc::new(FixedClock::default()),
            notifier.clone(),
        );
        (service, notifier)
    }

    #[test]
    fn create_lists_and_notifies() {
        let (service, notifier) = service();
        service.create(LabelKind::Project, " Thesis ").unwrap();

        let projects = service.list(LabelKind::Project).unwrap();
        assert_eq!(projects[0].name, "Thesis");
        assert!(service.list(LabelKind::Tag).unwrap().is_empty());
        assert_eq!(notifier.count(), 1);
    }

    #[test]
    fn names_are_unique_per_kind_ignoring_case() {
        let (service, _) = service();
        service.create(LabelKind::Tag, "Home").unwrap();

        assert!(matches!(
            service.create(LabelKind::Tag, "home"),
            Err(ApplicationError::DuplicateLabel)
        ));
        assert!(service.create(LabelKind::Project, "home").is_ok());
    }

    #[test]
    fn blank_name_is_rejected() {
        let (service, _) = service();
        assert!(matches!(
            service.create(LabelKind::Tag, "  "),
            Err(ApplicationError::Domain(DomainError::EmptyName))
        ));
    }

    #[test]
    fn rename_allows_own_name_but_not_a_taken_one() {
        let (service, _) = service();
        let a = service.create(LabelKind::Tag, "a").unwrap();
        service.create(LabelKind::Tag, "b").unwrap();

        assert!(service.rename(LabelKind::Tag, &a.id, "A").is_ok());
        assert!(matches!(
            service.rename(LabelKind::Tag, &a.id, "B"),
            Err(ApplicationError::DuplicateLabel)
        ));
    }

    #[test]
    fn delete_and_rename_of_unknown_id_is_not_found() {
        let (service, _) = service();
        assert!(matches!(
            service.delete(LabelKind::Tag, "x"),
            Err(ApplicationError::LabelNotFound)
        ));
        assert!(matches!(
            service.rename(LabelKind::Tag, "x", "n"),
            Err(ApplicationError::LabelNotFound)
        ));
    }
}
