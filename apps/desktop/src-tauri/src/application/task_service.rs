use std::sync::Arc;

use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::ports::{ChangeNotifier, Clock, TaskRepository};
use crate::domain::task::{NewTask, Task, TaskPatch};

pub struct TaskService {
    repository: Arc<dyn TaskRepository>,
    clock: Arc<dyn Clock>,
    notifier: Arc<dyn ChangeNotifier>,
}

impl TaskService {
    pub fn new(
        repository: Arc<dyn TaskRepository>,
        clock: Arc<dyn Clock>,
        notifier: Arc<dyn ChangeNotifier>,
    ) -> Self {
        Self {
            repository,
            clock,
            notifier,
        }
    }

    pub fn create_task(&self, input: NewTask) -> Result<Task, ApplicationError> {
        let task = Task::new(Uuid::now_v7().to_string(), input, self.clock.now())?;
        self.repository.insert(&task)?;
        self.notifier.tasks_changed();
        Ok(task)
    }

    pub fn update_task(&self, id: &str, patch: TaskPatch) -> Result<Task, ApplicationError> {
        let mut task = self.active(id)?;
        task.apply(patch, self.clock.now())?;
        self.repository.update(&task)?;
        self.notifier.tasks_changed();
        Ok(task)
    }

    /// Moves a task to Trash. Nothing is removed from the database.
    pub fn trash_task(&self, id: &str) -> Result<Task, ApplicationError> {
        let mut task = self.active(id)?;
        task.trash(self.clock.now());
        self.repository.update(&task)?;
        self.notifier.tasks_changed();
        Ok(task)
    }

    pub fn restore_task(&self, id: &str) -> Result<Task, ApplicationError> {
        let mut task = self.trashed(id)?;
        task.restore(self.clock.now());
        self.repository.update(&task)?;
        self.notifier.tasks_changed();
        Ok(task)
    }

    /// Permanently removes a task. Only allowed from Trash, so one step can never delete live data.
    pub fn purge_task(&self, id: &str) -> Result<(), ApplicationError> {
        self.trashed(id)?;
        self.repository.purge(id)?;
        self.notifier.tasks_changed();
        Ok(())
    }

    pub fn list_tasks(&self) -> Result<Vec<Task>, ApplicationError> {
        Ok(self.repository.list_active()?)
    }

    pub fn list_trash(&self) -> Result<Vec<Task>, ApplicationError> {
        Ok(self.repository.list_trashed()?)
    }

    fn active(&self, id: &str) -> Result<Task, ApplicationError> {
        self.repository
            .find_active(id)?
            .ok_or(ApplicationError::TaskNotFound)
    }

    fn trashed(&self, id: &str) -> Result<Task, ApplicationError> {
        self.repository
            .find_trashed(id)?
            .ok_or(ApplicationError::TaskNotFound)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Mutex;

    use chrono::{DateTime, Utc};

    use super::*;
    use crate::domain::errors::DomainError;
    use crate::domain::ports::RepositoryError;
    use crate::domain::task::TaskStatus;

    struct FixedClock(DateTime<Utc>);

    impl Clock for FixedClock {
        fn now(&self) -> DateTime<Utc> {
            self.0
        }
    }

    #[derive(Default)]
    struct CountingNotifier {
        count: AtomicUsize,
    }

    impl ChangeNotifier for CountingNotifier {
        fn tasks_changed(&self) {
            self.count.fetch_add(1, Ordering::SeqCst);
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

        fn update(&self, task: &Task) -> Result<(), RepositoryError> {
            let mut tasks = self.tasks.lock().unwrap();
            if let Some(slot) = tasks.iter_mut().find(|t| t.id == task.id) {
                *slot = task.clone();
            }
            Ok(())
        }

        fn purge(&self, id: &str) -> Result<bool, RepositoryError> {
            let mut tasks = self.tasks.lock().unwrap();
            let before = tasks.len();
            tasks.retain(|t| t.id != id);
            Ok(tasks.len() != before)
        }

        fn find_active(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
            Ok(self
                .tasks
                .lock()
                .unwrap()
                .iter()
                .find(|t| t.id == id && !t.is_trashed())
                .cloned())
        }

        fn find_trashed(&self, id: &str) -> Result<Option<Task>, RepositoryError> {
            Ok(self
                .tasks
                .lock()
                .unwrap()
                .iter()
                .find(|t| t.id == id && t.is_trashed())
                .cloned())
        }

        fn list_active(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(self
                .tasks
                .lock()
                .unwrap()
                .iter()
                .filter(|t| !t.is_trashed())
                .cloned()
                .collect())
        }

        fn list_trashed(&self) -> Result<Vec<Task>, RepositoryError> {
            Ok(self
                .tasks
                .lock()
                .unwrap()
                .iter()
                .filter(|t| t.is_trashed())
                .cloned()
                .collect())
        }
    }

    struct Fixture {
        service: TaskService,
        repository: Arc<MemoryRepository>,
        notifier: Arc<CountingNotifier>,
    }

    fn fixture() -> Fixture {
        let repository = Arc::new(MemoryRepository::default());
        let notifier = Arc::new(CountingNotifier::default());
        let now = DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let service = TaskService::new(
            repository.clone(),
            Arc::new(FixedClock(now)),
            notifier.clone(),
        );
        Fixture {
            service,
            repository,
            notifier,
        }
    }

    fn new_task(title: &str) -> NewTask {
        NewTask {
            title: title.into(),
            ..Default::default()
        }
    }

    #[test]
    fn created_task_is_listed_and_notifies_once() {
        let f = fixture();
        let created = f.service.create_task(new_task("Plan the day")).unwrap();

        assert_eq!(f.service.list_tasks().unwrap(), vec![created]);
        assert_eq!(f.notifier.count.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn blank_title_is_rejected_and_nothing_is_stored() {
        let f = fixture();
        let error = f.service.create_task(new_task("  ")).unwrap_err();

        assert!(matches!(
            error,
            ApplicationError::Domain(DomainError::EmptyTitle)
        ));
        assert!(f.repository.tasks.lock().unwrap().is_empty());
        assert_eq!(f.notifier.count.load(Ordering::SeqCst), 0);
    }

    #[test]
    fn update_changes_status_and_persists_it() {
        let f = fixture();
        let created = f.service.create_task(new_task("A")).unwrap();

        let updated = f
            .service
            .update_task(
                &created.id,
                TaskPatch {
                    status: Some(TaskStatus::Done),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(updated.status, TaskStatus::Done);
        assert_eq!(updated.revision, 2);
        assert_eq!(f.service.list_tasks().unwrap(), vec![updated]);
    }

    #[test]
    fn trash_hides_task_and_restore_brings_it_back() {
        let f = fixture();
        let created = f.service.create_task(new_task("A")).unwrap();

        f.service.trash_task(&created.id).unwrap();
        assert!(f.service.list_tasks().unwrap().is_empty());
        assert_eq!(f.service.list_trash().unwrap().len(), 1);

        f.service.restore_task(&created.id).unwrap();
        assert_eq!(f.service.list_tasks().unwrap().len(), 1);
        assert!(f.service.list_trash().unwrap().is_empty());
    }

    #[test]
    fn purge_requires_the_task_to_be_in_trash_first() {
        let f = fixture();
        let created = f.service.create_task(new_task("A")).unwrap();

        assert!(matches!(
            f.service.purge_task(&created.id),
            Err(ApplicationError::TaskNotFound)
        ));

        f.service.trash_task(&created.id).unwrap();
        f.service.purge_task(&created.id).unwrap();
        assert!(f.service.list_trash().unwrap().is_empty());
        assert!(f.repository.tasks.lock().unwrap().is_empty());
    }

    #[test]
    fn unknown_id_is_not_found() {
        let f = fixture();
        assert!(matches!(
            f.service.update_task("missing", TaskPatch::default()),
            Err(ApplicationError::TaskNotFound)
        ));
        assert!(matches!(
            f.service.restore_task("missing"),
            Err(ApplicationError::TaskNotFound)
        ));
    }
}
