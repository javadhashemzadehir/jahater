use crate::application::error::ApplicationError;
use crate::domain::errors::DomainError;
use crate::shared::error::CommandError;

/// Maps internal errors to the `{ code, message_key }` pair the UI localizes.
/// Free-text messages never leave the backend.
pub fn to_command_error(error: &ApplicationError) -> CommandError {
    match error {
        ApplicationError::Domain(DomainError::EmptyTitle) => CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.task.titleRequired",
        },
        ApplicationError::Repository(_) => CommandError {
            code: "STORAGE_FAILED",
            message_key: "errors.storage.failed",
        },
    }
}
