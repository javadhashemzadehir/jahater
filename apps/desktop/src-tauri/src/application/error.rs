use crate::domain::errors::DomainError;
use crate::domain::ports::RepositoryError;

#[derive(Debug, thiserror::Error)]
pub enum ApplicationError {
    #[error(transparent)]
    Domain(#[from] DomainError),
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("task not found")]
    TaskNotFound,
    #[error("project or tag not found")]
    LabelNotFound,
    #[error("a project or tag with this name already exists")]
    DuplicateLabel,
    #[error("no timer is running")]
    NoActiveTimer,
    #[error("time block not found")]
    BlockNotFound,
}
