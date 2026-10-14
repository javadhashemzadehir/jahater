use std::sync::Arc;

use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::ports::{Clock, TaskRepository};
use crate::domain::task::Task;

pub struct TaskService {
    repository: Arc<dyn TaskRepository>,
    clock: Arc<dyn Clock>,
}

impl TaskService {
    pub fn new(repository: Arc<dyn TaskRepository>, clock: Arc<dyn Clock>) -> Self {
        Self { repository, clock }
    }

    pub fn create_task(&self, title: &str) -> Result<Task, ApplicationError> {
        let task = Task::new(Uuid::now_v7().to_string(), title, self.clock.now())?;
        self.repository.insert(&task)?;
        Ok(task)
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, ApplicationError> {
        Ok(self.repository.list_active()?)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::errors::DomainError;
    use crate::domain::ports::RepositoryError;

    struct FixedClock(DateTime<Utc>);

    impl Clock for FixedClock {
        fn now(&self) -> DateTime<Utc> {
            self.0
        }
    }

    #[derive(Default)]
    struct MemoryRepository {
        tasks: Mutex<Vec<Task>>,
    }

    impl TaskRepository for MemoryRepository {
        fn insert(&self, task: &Task) -> Result<(), RepositoryError> {
            self.tasks.lock().unwrap().push(task.clone());
            Ok(())
        }

        fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(self.tasks.lock().unwrap().clone())
        }
    }

    fn service() -> (TaskService, Arc<MemoryRepository>) {
        let repository = Arc::new(MemoryRepository::default());
        let now = DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let service = TaskService::new(repository.clone(), Arc::new(FixedClock(now)));
        (service, repository)
    }

    #[test]
    fn created_task_is_listed() {
        let (service, _) = service();
        let created = service.create_task("Plan the day").unwrap();
        let listed = service.list_tasks().unwrap();
        assert_eq!(listed, vec![created]);
    }

    #[test]
    fn blank_title_is_rejected_and_nothing_is_stored() {
        let (service, repository) = service();
        let error = service.create_task("  ").unwrap_err();
        assert!(matches!(
            error,
            ApplicationError::Domain(DomainError::EmptyTitle)
        ));
        assert!(repository.tasks.lock().unwrap().is_empty());
    }
}
