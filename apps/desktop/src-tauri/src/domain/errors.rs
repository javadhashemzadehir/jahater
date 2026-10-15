#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum DomainError {
    #[error("task title is empty")]
    EmptyTitle,
    #[error("estimate must be a positive number of minutes")]
    InvalidEstimate,
    #[error("name is empty")]
    EmptyName,
    #[error("timer is already paused")]
    TimerAlreadyPaused,
    #[error("timer is not paused")]
    TimerNotPaused,
    #[error("timer was already stopped")]
    TimerStopped,
    #[error("a timebox needs a target length")]
    TimerTargetRequired,
    #[error("target must be a positive number of minutes")]
    InvalidTimerTarget,
    #[error("block length must be between 1 minute and 24 hours")]
    InvalidDuration,
}
