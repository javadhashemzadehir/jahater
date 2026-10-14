use serde::Serialize;

/// The only error shape that crosses IPC. The UI looks up `message_key` in its dictionaries.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: &'static str,
    pub message_key: &'static str,
}
