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
}
