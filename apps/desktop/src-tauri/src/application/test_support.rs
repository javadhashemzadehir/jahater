//! Fakes shared by the service tests.

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use chrono::{DateTime, Utc};

use crate::domain::label::{Label, LabelKind};
use crate::domain::ports::{ChangeNotifier, Clock, LabelRepository, RepositoryError};

pub struct FixedClock(pub DateTime<Utc>);

impl Default for FixedClock {
    fn default() -> Self {
        Self(
            DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        )
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        self.0
    }
}

#[derive(Default)]
pub struct CountingNotifier {
    pub count: AtomicUsize,
}

impl CountingNotifier {
    pub fn count(&self) -> usize {
        self.count.load(Ordering::SeqCst)
    }
}

impl ChangeNotifier for CountingNotifier {
    fn tasks_changed(&self) {
        self.count.fetch_add(1, Ordering::SeqCst);
    }
}

#[derive(Default)]
pub struct MemoryLabels {
    rows: Mutex<Vec<(LabelKind, Label)>>,
}

impl MemoryLabels {
    pub fn add(&self, kind: LabelKind, label: Label) {
        self.rows.lock().unwrap().push((kind, label));
    }
}

pub fn label(id: &str, name: &str) -> Label {
    Label::new(id.into(), name, FixedClock::default().0).unwrap()
}

impl LabelRepository for MemoryLabels {
    fn insert(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError> {
        self.add(kind, label.clone());
        Ok(())
    }

    fn update(&self, kind: LabelKind, label: &Label) -> Result<(), RepositoryError> {
        let mut rows = self.rows.lock().unwrap();
        if let Some(slot) = rows
            .iter_mut()
            .find(|(k, l)| *k == kind && l.id == label.id)
        {
            slot.1 = label.clone();
        }
        Ok(())
    }

    fn delete(&self, kind: LabelKind, id: &str) -> Result<bool, RepositoryError> {
        let mut rows = self.rows.lock().unwrap();
        let before = rows.len();
        rows.retain(|(k, l)| !(*k == kind && l.id == id));
        Ok(rows.len() != before)
    }

    fn find(&self, kind: LabelKind, id: &str) -> Result<Option<Label>, RepositoryError> {
        Ok(self
            .rows
            .lock()
            .unwrap()
            .iter()
            .find(|(k, l)| *k == kind && l.id == id)
            .map(|(_, l)| l.clone()))
    }

    fn list(&self, kind: LabelKind) -> Result<Vec<Label>, RepositoryError> {
        Ok(self
            .rows
            .lock()
            .unwrap()
            .iter()
            .filter(|(k, _)| *k == kind)
            .map(|(_, l)| l.clone())
            .collect())
    }
}
