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
        ApplicationError::Domain(DomainError::InvalidEstimate) => CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.task.estimateInvalid",
        },
        ApplicationError::Domain(DomainError::EmptyName) => CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.label.nameRequired",
        },
        ApplicationError::LabelNotFound => CommandError {
            code: "NOT_FOUND",
            message_key: "errors.label.notFound",
        },
        ApplicationError::DuplicateLabel => CommandError {
            code: "CONFLICT",
            message_key: "errors.label.duplicate",
        },
        ApplicationError::Domain(DomainError::TimerAlreadyPaused) => CommandError {
            code: "CONFLICT",
            message_key: "errors.timer.alreadyPaused",
        },
        ApplicationError::Domain(DomainError::TimerNotPaused) => CommandError {
            code: "CONFLICT",
            message_key: "errors.timer.notPaused",
        },
        ApplicationError::Domain(DomainError::TimerStopped) => CommandError {
            code: "CONFLICT",
            message_key: "errors.timer.stopped",
        },
        ApplicationError::Domain(DomainError::TimerTargetRequired) => CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.timer.targetRequired",
        },
        ApplicationError::Domain(DomainError::InvalidTimerTarget) => CommandError {
            code: "VALIDATION_FAILED",
            message_key: "errors.timer.targetInvalid",
        },
        ApplicationError::NoActiveTimer => CommandError {
            code: "NOT_FOUND",
            message_key: "errors.timer.none",
        },
        ApplicationError::TaskNotFound => CommandError {
            code: "NOT_FOUND",
            message_key: "errors.task.notFound",
        },
        ApplicationError::Repository(_) => CommandError {
            code: "STORAGE_FAILED",
            message_key: "errors.storage.failed",
        },
    }
}
