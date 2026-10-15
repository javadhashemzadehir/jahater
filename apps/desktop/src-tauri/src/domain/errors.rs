#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum DomainError {
    #[error("task title is empty")]
    EmptyTitle,
    #[error("estimate must be a positive number of minutes")]
    InvalidEstimate,
}
