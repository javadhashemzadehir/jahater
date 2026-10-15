use super::errors::DomainError;

pub const DEFAULT_CAPACITY_MINUTES: u32 = 6 * 60;
pub const MAX_CAPACITY_MINUTES: u32 = 24 * 60;

/// Device preferences. Locale and theme live in the frontend, not here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Settings {
    /// How much planned work fits in a day. Used for the overload warning, never to move anything.
    pub capacity_minutes: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            capacity_minutes: DEFAULT_CAPACITY_MINUTES,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SettingsPatch {
    pub capacity_minutes: Option<u32>,
}

impl Settings {
    pub fn apply(&mut self, patch: SettingsPatch) -> Result<(), DomainError> {
        if let Some(minutes) = patch.capacity_minutes {
            self.capacity_minutes = validate_capacity(minutes)?;
        }
        Ok(())
    }
}

pub fn validate_capacity(minutes: u32) -> Result<u32, DomainError> {
    if minutes == 0 || minutes > MAX_CAPACITY_MINUTES {
        return Err(DomainError::InvalidCapacity);
    }
    Ok(minutes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_capacity_is_six_hours() {
        assert_eq!(Settings::default().capacity_minutes, 360);
    }

    #[test]
    fn capacity_must_be_between_one_minute_and_a_day() {
        let mut settings = Settings::default();
        for bad in [0, MAX_CAPACITY_MINUTES + 1] {
            assert_eq!(
                settings.apply(SettingsPatch {
                    capacity_minutes: Some(bad)
                }),
                Err(DomainError::InvalidCapacity)
            );
        }
        settings
            .apply(SettingsPatch {
                capacity_minutes: Some(240),
            })
            .unwrap();
        assert_eq!(settings.capacity_minutes, 240);
    }

    #[test]
    fn an_empty_patch_changes_nothing() {
        let mut settings = Settings::default();
        settings.apply(SettingsPatch::default()).unwrap();
        assert_eq!(settings, Settings::default());
    }
}
