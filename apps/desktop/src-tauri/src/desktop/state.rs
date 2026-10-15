use crate::application::block_service::BlockService;
use crate::application::label_service::LabelService;
use crate::application::review_service::{ReviewService, SettingsService};
use crate::application::task_service::TaskService;
use crate::application::timer_service::TimerService;

pub struct AppState {
    pub tasks: TaskService,
    pub labels: LabelService,
    pub timer: TimerService,
    pub blocks: BlockService,
    pub reviews: ReviewService,
    pub settings: SettingsService,
}
