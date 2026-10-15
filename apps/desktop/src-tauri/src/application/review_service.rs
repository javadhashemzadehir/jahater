use std::sync::Arc;

use uuid::Uuid;

use super::error::ApplicationError;
use crate::domain::ports::{Clock, MetaRepository, ReviewRepository};
use crate::domain::review::{validate_day, DailyReview, ReviewPatch};
use crate::domain::settings::{Settings, SettingsPatch};

/// Morning and evening check-ins, one record per local day.
pub struct ReviewService {
    reviews: Arc<dyn ReviewRepository>,
    clock: Arc<dyn Clock>,
}

impl ReviewService {
    pub fn new(reviews: Arc<dyn ReviewRepository>, clock: Arc<dyn Clock>) -> Self {
        Self { reviews, clock }
    }

    pub fn get(&self, day: &str) -> Result<Option<DailyReview>, ApplicationError> {
        validate_day(day)?;
        Ok(self.reviews.find_by_day(day)?)
    }

    /// Creates the day's review on first save and patches it afterwards.
    pub fn save(&self, day: &str, patch: ReviewPatch) -> Result<DailyReview, ApplicationError> {
        validate_day(day)?;
        let now = self.clock.now();
        match self.reviews.find_by_day(day)? {
            Some(mut review) => {
                review.apply(patch, now)?;
                self.reviews.update(&review)?;
                Ok(review)
            }
            None => {
                let mut review = DailyReview::new(Uuid::now_v7().to_string(), day, now)?;
                review.apply(patch, now)?;
                // A new review starts at revision 1 even though the first patch bumped it.
                review.revision = 1;
                self.reviews.insert(&review)?;
                Ok(review)
            }
        }
    }
}

/// Device preferences stored in `app_meta`.
pub struct SettingsService {
    meta: Arc<dyn MetaRepository>,
}

pub const CAPACITY_KEY: &str = "capacity_minutes";

impl SettingsService {
    pub fn new(meta: Arc<dyn MetaRepository>) -> Self {
        Self { meta }
    }

    pub fn get(&self) -> Result<Settings, ApplicationError> {
        let mut settings = Settings::default();
        // A stored value that no longer parses or validates falls back to the default
        // instead of blocking the app.
        if let Some(minutes) = self
            .meta
            .get(CAPACITY_KEY)?
            .and_then(|text| text.parse::<u32>().ok())
        {
            let _ = settings.apply(SettingsPatch {
                capacity_minutes: Some(minutes),
            });
        }
        Ok(settings)
    }

    pub fn update(&self, patch: SettingsPatch) -> Result<Settings, ApplicationError> {
        let mut settings = self.get()?;
        settings.apply(patch)?;
        self.meta
            .set(CAPACITY_KEY, &settings.capacity_minutes.to_string())?;
        Ok(settings)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;
    use crate::application::test_support::FixedClock;
    use crate::domain::errors::DomainError;
    use crate::domain::ports::RepositoryError;

    #[derive(Default)]
    struct MemoryReviews(Mutex<Vec<DailyReview>>);

    impl ReviewRepository for MemoryReviews {
        fn find_by_day(&self, day: &str) -> Result<Option<DailyReview>, RepositoryError> {
            Ok(self
                .0
                .lock()
                .unwrap()
                .iter()
                .find(|r| r.day == day)
                .cloned())
        }
        fn insert(&self, review: &DailyReview) -> Result<(), RepositoryError> {
            self.0.lock().unwrap().push(review.clone());
            Ok(())
        }
        fn update(&self, review: &DailyReview) -> Result<(), RepositoryError> {
            let mut rows = self.0.lock().unwrap();
            if let Some(slot) = rows.iter_mut().find(|r| r.id == review.id) {
                *slot = review.clone();
            }
            Ok(())
        }
    }

    #[derive(Default)]
    struct MemoryMeta(Mutex<HashMap<String, String>>);

    impl MetaRepository for MemoryMeta {
        fn get(&self, key: &str) -> Result<Option<String>, RepositoryError> {
            Ok(self.0.lock().unwrap().get(key).cloned())
        }
        fn set(&self, key: &str, value: &str) -> Result<(), RepositoryError> {
            self.0.lock().unwrap().insert(key.into(), value.into());
            Ok(())
        }
    }

    fn reviews() -> ReviewService {
        ReviewService::new(
            Arc::new(MemoryReviews::default()),
            Arc::new(FixedClock::default()),
        )
    }

    #[test]
    fn first_save_creates_and_later_saves_update_the_same_day() {
        let service = reviews();
        let first = service
            .save(
                "2026-10-15",
                ReviewPatch {
                    energy_level: Some(Some(4)),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(first.revision, 1);

        let second = service
            .save(
                "2026-10-15",
                ReviewPatch {
                    evening_note: Some(Some("Finished the draft".into())),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(second.id, first.id);
        assert_eq!(second.revision, 2);
        assert_eq!(second.energy_level, Some(4));
        assert_eq!(service.get("2026-10-15").unwrap(), Some(second));
    }

    #[test]
    fn other_days_are_separate_and_empty_until_saved() {
        let service = reviews();
        service.save("2026-10-15", ReviewPatch::default()).unwrap();
        assert!(service.get("2026-10-16").unwrap().is_none());
    }

    #[test]
    fn invalid_day_and_energy_are_rejected_and_nothing_is_stored() {
        let service = reviews();
        assert!(matches!(
            service.save("tomorrow", ReviewPatch::default()),
            Err(ApplicationError::Domain(DomainError::InvalidDay))
        ));
        assert!(matches!(
            service.save(
                "2026-10-15",
                ReviewPatch {
                    energy_level: Some(Some(9)),
                    ..Default::default()
                }
            ),
            Err(ApplicationError::Domain(DomainError::InvalidEnergy))
        ));
        assert!(service.get("2026-10-15").unwrap().is_none());
    }

    #[test]
    fn settings_default_then_persist() {
        let service = SettingsService::new(Arc::new(MemoryMeta::default()));
        assert_eq!(service.get().unwrap().capacity_minutes, 360);

        let updated = service
            .update(SettingsPatch {
                capacity_minutes: Some(300),
            })
            .unwrap();
        assert_eq!(updated.capacity_minutes, 300);
        assert_eq!(service.get().unwrap().capacity_minutes, 300);
    }

    #[test]
    fn bad_capacity_is_rejected_and_the_old_value_stays() {
        let service = SettingsService::new(Arc::new(MemoryMeta::default()));
        service
            .update(SettingsPatch {
                capacity_minutes: Some(300),
            })
            .unwrap();
        assert!(matches!(
            service.update(SettingsPatch {
                capacity_minutes: Some(0)
            }),
            Err(ApplicationError::Domain(DomainError::InvalidCapacity))
        ));
        assert_eq!(service.get().unwrap().capacity_minutes, 300);
    }

    #[test]
    fn a_corrupt_stored_value_falls_back_to_the_default() {
        let meta = Arc::new(MemoryMeta::default());
        meta.set(CAPACITY_KEY, "lots").unwrap();
        let service = SettingsService::new(meta);
        assert_eq!(service.get().unwrap().capacity_minutes, 360);
    }
}
