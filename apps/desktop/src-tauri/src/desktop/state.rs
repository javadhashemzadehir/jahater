use crate::application::label_service::LabelService;
use crate::application::task_service::TaskService;

pub struct AppState {
    pub tasks: TaskService,
    pub labels: LabelService,
}
