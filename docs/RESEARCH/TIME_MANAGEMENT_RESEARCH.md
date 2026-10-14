# Time-management research (ADHD focus)

Collected 2026-10-14. Gathers techniques and concepts, and states what each one means for the product.

## Evidence warning

Sources are a mix of general health media, practitioner blogs and vendor blogs. That is enough to guide product design. It is not enough to make scientific claims in videos or marketing. The evidence column uses:

- **Low:** one source or a vendor claim.
- **Medium:** several independent sources agree, but no peer-reviewed study was checked.
- **Verified:** reserved for claims backed by a paper that has been read. None yet.

## 1. Core concept: time blindness

- Sources describe it as difficulty perceiving the passage of time and managing it, and as a prominent feature of ADHD.
- One source notes it is not a formal medical diagnosis, and that not everyone with ADHD experiences it.
- Russell Barkley is named in several sources as a key researcher on time perception in ADHD. His work still needs to be read first-hand.
- Commonly listed components: poor duration estimates, trouble starting, working-memory limits, difficulty sustaining attention on low-stimulation tasks.
- Shared practical conclusion: internal time sense is unreliable, so build external, visible, concrete time structure.

**Product consequence:** every main screen shows time, it does not only record it.

## 2. Techniques and product impact

| Technique | Summary | Evidence | Product impact |
| --- | --- | --- | --- |
| Make time visible | Visual timers that show time draining; analog clocks | Medium | Large circular timer, progress inside timeline blocks, always-visible "now" line |
| Estimate buffer | Add about 50% to estimates (multiply by 1.5) | Medium; exact factor unverified | Store estimate and actual; suggest a personal factor from the user's own data |
| Flexible time blocking | Assign blocks to activities instead of rigid hour-by-hour schedules | Medium | Draggable blocks with buffer and transition kinds |
| Scheduled free time | Deliberately step out of the clock weekly to reduce pressure | Low (one source) | "Free time" block that sends no notifications |
| Body doubling | Work alongside another person, in person or virtually | Medium; sources say research is still emerging | Post-MVP "co-working room" mode |
| Reverse planning | Start from arrival time and count backwards | Low to medium | "Leave by" reminder for events with fixed times |
| Track real time | Measure actual duration to calibrate estimates | Medium | Integrated tracker linked to tasks |
| Break tasks down | Reduce task-initiation paralysis | Medium (common in sources, thin on citations) | Subtasks and a "smallest first step" action |
| Gamification | Rewards and immediate feedback | Low | Later phase, used carefully |
| CBT-style procrastination support | Structured reflection on avoidance | Low (seen as a feature in Super Productivity) | Evaluate for a later phase |

## 3. General techniques you already use

| Technique | Definition | In the product |
| --- | --- | --- |
| Eisenhower matrix | Sort by urgent and important | Two boolean flags per task; a four-quadrant view |
| Kanban | Columns by status | Status field on the same task; Kanban is a view |
| Timeboxing | Fixed time cap for a task | A timer with a target duration; the cap |
| Time blocking | A fixed place in the day for a task | A planned block on the timeline |
| Pomodoro / Flowtime | Work/break cycles | Configurable and skippable; hypothesis: rigid cycles may disturb deep focus |
| Time tracking | Measure actual time | Foundation for estimate calibration |

Timeboxing is a ceiling, time blocking is a placement. The data model keeps them separate: `time_blocks` for placement, `time_entries.target_min` for the ceiling.

## 4. Design principles that follow

1. Time is visible on every main screen.
2. Reduce decisions, but keep control with the user.
3. Planning is light and short. Heavy rituals get abandoned.
4. Estimates are corrected using the user's own data, not a generic number.
5. Notifications are controllable and never shaming.
6. A missed plan is not punished: no broken streaks, no failure copy.

## 5. Verification tasks

- [ ] Find peer-reviewed studies on time estimation in adults with ADHD.
- [ ] Find peer-reviewed studies on body doubling.
- [ ] Read Barkley's work on time perception.
- [ ] Check evidence for the 1.5x estimate factor.
- [ ] Check evidence on Pomodoro and Flowtime for ADHD.
- [ ] Look for systematic reviews on digital interventions for ADHD.

Until these are ticked, describe the techniques as "commonly recommended" and do not present numbers as established.

## Sources

- [Time blindness in ADHD, Simply Psychology](https://www.simplypsychology.com/articles/adhd-time-blindness-management)
- [ADHD time management, WebMD](https://www.webmd.com/add-adhd/features/cm/adhd-take-control-organization-time-management)
- [ADHD time blindness, Flow Club](https://www.flow.club/blog/adhd-time-blindness)
- [Time management and ADHD, JobCannon](https://jobcannon.io/blog/time-management-adhd)
- [Frontiers Friday #145](https://darylchow.substack.com/p/ff145)
- [ADHD time toolkit, Substack](https://elidervonte.substack.com/p/your-adhd-time-toolkit-essential)
