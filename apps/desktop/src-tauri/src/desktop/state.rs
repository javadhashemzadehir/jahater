use crate::application::label_service::LabelService;
use crate::application::task_service::TaskService;
use crate::application::timer_service::TimerService;

pub struct AppState {
    pub tasks: TaskService,
    pub labels: LabelService,
    pub timer: TimerService,
}
