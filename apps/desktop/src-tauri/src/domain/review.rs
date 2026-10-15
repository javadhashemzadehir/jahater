use chrono::{DateTime, NaiveDate, Utc};

use super::errors::DomainError;

pub const MIN_ENERGY: u8 = 1;
pub const MAX_ENERGY: u8 = 5;

/// A short check-in for one local day. Every field is optional: a review can be a single tap.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DailyReview {
    pub id: String,
    /// Local date, `YYYY-MM-DD`.
    pub day: String,
    pub morning_note: Option<String>,
    pub evening_note: Option<String>,
    pub energy_level: Option<u8>,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// `None` leaves a field alone; `Some(None)` clears it.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ReviewPatch {
    pub morning_note: Option<Option<String>>,
    pub evening_note: Option<Option<String>>,
    pub energy_level: Option<Option<u8>>,
}

/// Accepts only a real calendar date written as `YYYY-MM-DD`.
pub fn validate_day(day: &str) -> Result<(), DomainError> {
    let shaped = day.len() == 10 && NaiveDate::parse_from_str(day, "%Y-%m-%d").is_ok();
    if shaped {
        Ok(())
    } else {
        Err(DomainError::InvalidDay)
    }
}

impl DailyReview {
    pub fn new(id: String, day: &str, now: DateTime<Utc>) -> Result<Self, DomainError> {
        validate_day(day)?;
        Ok(Self {
            id,
            day: day.to_owned(),
            morning_note: None,
            evening_note: None,
            energy_level: None,
            revision: 1,
            created_at: now,
            updated_at: now,
        })
    }

    /// Applies a patch. Everything is validated before anything changes.
    pub fn apply(&mut self, patch: ReviewPatch, now: DateTime<Utc>) -> Result<(), DomainError> {
        if let Some(Some(level)) = patch.energy_level {
            if !(MIN_ENERGY..=MAX_ENERGY).contains(&level) {
                return Err(DomainError::InvalidEnergy);
            }
        }
        if let Some(note) = patch.morning_note {
            self.morning_note = normalize(note);
        }
        if let Some(note) = patch.evening_note {
            self.evening_note = normalize(note);
        }
        if let Some(level) = patch.energy_level {
            self.energy_level = level;
        }
        self.revision += 1;
        self.updated_at = now;
        Ok(())
    }
}

fn normalize(value: Option<String>) -> Option<String> {
    value.filter(|text| !text.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-10-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn review() -> DailyReview {
        DailyReview::new("r1".into(), "2026-10-15", now()).unwrap()
    }

    #[test]
    fn day_must_be_a_real_iso_date() {
        for bad in [
            "2026-13-01",
            "2026-02-30",
            "15-10-2026",
            "2026-1-5",
            "",
            "2026-10-15T00",
        ] {
            assert_eq!(
                DailyReview::new("r".into(), bad, now()),
                Err(DomainError::InvalidDay),
                "{bad}"
            );
        }
        assert!(validate_day("2026-02-28").is_ok());
    }

    #[test]
    fn patch_sets_and_clears_fields_and_bumps_revision() {
        let mut review = review();
        review
            .apply(
                ReviewPatch {
                    morning_note: Some(Some("Start with the report".into())),
                    energy_level: Some(Some(3)),
                    ..Default::default()
                },
                now(),
            )
            .unwrap();
        assert_eq!(
            review.morning_note.as_deref(),
            Some("Start with the report")
        );
        assert_eq!(review.energy_level, Some(3));
        assert_eq!(review.revision, 2);

        review
            .apply(
                ReviewPatch {
                    energy_level: Some(None),
                    morning_note: Some(Some("  ".into())),
                    ..Default::default()
                },
                now(),
            )
            .unwrap();
        assert_eq!(review.energy_level, None);
        assert_eq!(review.morning_note, None);
    }

    #[test]
    fn energy_outside_one_to_five_is_rejected_and_nothing_changes() {
        for bad in [0, 6] {
            let mut review = review();
            let result = review.apply(
                ReviewPatch {
                    morning_note: Some(Some("x".into())),
                    energy_level: Some(Some(bad)),
                    ..Default::default()
                },
                now(),
            );
            assert_eq!(result, Err(DomainError::InvalidEnergy));
            assert_eq!(review.morning_note, None);
            assert_eq!(review.revision, 1);
        }
    }
}
