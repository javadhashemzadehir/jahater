use tauri::{AppHandle, Emitter};

use crate::domain::ports::ChangeNotifier;

pub const TASKS_CHANGED: &str = "tasks://changed";
pub const TIMER_CHANGED: &str = "timer://changed";

/// Emits `tasks://changed` to the webview after every task write.
pub struct TauriChangeNotifier {
    app: AppHandle,
}

impl TauriChangeNotifier {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl ChangeNotifier for TauriChangeNotifier {
    fn tasks_changed(&self) {
        // A failed emit only means the window is gone; the write itself already succeeded.
        let _ = self.app.emit(TASKS_CHANGED, ());
    }

    fn timer_changed(&self) {
        let _ = self.app.emit(TIMER_CHANGED, ());
    }
}
