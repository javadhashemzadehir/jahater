# Requirements

Priorities use MoSCoW: **M** must (MVP), **S** should, **C** could, **W** won't for now.

## 1. Functional requirements

### Tasks

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-01 | Create, edit, soft-delete, restore, archive tasks with title, notes, project, tags | M |
| FR-02 | Quick capture via global shortcut, title only, without opening the main window | M |
| FR-03 | Subtasks and checklist | S |
| FR-04 | `is_urgent` and `is_important` flags per task | M |
| FR-05 | Status: `todo`, `doing`, `done`, `archived` | M |
| FR-06 | Estimate (minutes) and actual time per task | M |
| FR-07 | Recurring tasks | S |
| FR-08 | Due date with sorting | S |
| FR-09 | Trash view with restore and permanent delete behind a confirmation dialog (ADR 009) | S |

### Views

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-10 | List view | M |
| FR-11 | Kanban view with drag and drop (changes `status`) | M |
| FR-12 | Eisenhower matrix with drag and drop (changes the two flags) | M |
| FR-13 | Daily timeline with time blocks | M |
| FR-14 | Weekly view | S |
| FR-15 | All views read the same rows; a change in one appears in all | M |
| FR-16 | Keyboard alternative for every drag and drop action | M |

### Time

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-20 | Place a task on the timeline as a block with start and duration | M |
| FR-21 | Timebox: target duration with countdown | M |
| FR-22 | Circular visual timer | M |
| FR-23 | Time tracker with start, pause, stop; only one running entry at a time | M |
| FR-24 | Pomodoro and Flowtime, configurable and skippable | S |
| FR-25 | Buffer and transition block kinds | S |
| FR-26 | Report: estimate vs actual by day, project, tag | M |
| FR-27 | Suggested personal estimate factor from history | C |

### ADHD support

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-30 | Overload warning when planned estimates exceed configured daily capacity | S |
| FR-31 | "Smallest first step" action to split a task | S |
| FR-32 | Start-of-day and end-of-day review, each under 2 minutes | S |
| FR-33 | Focus mode showing only current task and timer | S |
| FR-34 | Free-time block with no notifications | C |
| FR-35 | Body doubling room | W |

### Localization and theming

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-40 | Full RTL layout for `fa`, LTR for `en`, one component tree | M |
| FR-41 | Locale switcher; `fa` default; preference persisted locally | M |
| FR-42 | Every user-facing string comes from the dictionaries (`fa`, `en`) | M |
| FR-43 | Theme modes: Light, Dark, System, with a three-button switcher | M |
| FR-44 | System mode follows the OS and reacts live to OS changes | M |
| FR-45 | Jalali calendar display for `fa`, Gregorian for `en`; storage always Gregorian ISO | M |
| FR-46 | Configurable week start; default Saturday for `fa`, Monday for `en` | S |
| FR-47 | Digits follow locale: Persian numerals in `fa` (through the font), Latin in `en` | S |

### Platform and data

| ID | Requirement | Pri |
| --- | --- | --- |
| FR-50 | System notifications for block start and timebox end, sent from Rust | M |
| FR-51 | Tray icon, close-to-tray, launch at login (device preferences) | S |
| FR-52 | Export and import (JSON) | M |
| FR-53 | Automatic daily backup with rotation | S |
| FR-54 | Configurable global shortcuts with remapping in Settings | S |
| FR-55 | Sync between devices | W |
| FR-56 | Automatic app activity tracking | W |

## 2. Non-functional requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| NFR-01 | Privacy | No network calls by default. No telemetry. No auto-updater in v0.x. |
| NFR-02 | Offline | All MVP features work with no network. |
| NFR-03 | Startup | Target under 2 seconds to interactive on a mid-range laptop. Measure before publishing the number. |
| NFR-04 | Footprint | Lower idle memory than comparable Electron planners. Measure before claiming. |
| NFR-05 | Timer correctness | Elapsed time derives from absolute timestamps. Correct after sleep, suspend, crash. |
| NFR-06 | Data safety | Every write is transactional; WAL mode; versioned migrations; backups. |
| NFR-07 | Accessibility | Full keyboard navigation, visible focus, sufficient contrast in all three theme modes, respects reduced-motion (`MotionConfig reducedMotion="user"`). |
| NFR-08 | Theme correctness | No flash of wrong theme on launch. Every component uses design tokens only, no hardcoded colors. |
| NFR-09 | Locale correctness | Both locales and both directions tested. No hardcoded left/right utilities; use logical ones. |
| NFR-10 | Platforms | Windows first (NSIS and MSI), Linux in CI, macOS after testing. |
| NFR-11 | Contribution | Contributor guide, tests, CI on every pull request. |
| NFR-12 | Licensing | Dependencies compatible with the project licence; bundled fonts checked for redistribution rights. |

## 3. Out of scope for v0.1

- Accounts and cloud services.
- Mobile apps.
- Team features.
- AI auto-scheduling.

## 4. Key scenarios

1. **Morning:** open Today, drag tasks onto the timeline, see the overload warning, move one to tomorrow.
2. **Midday capture:** press the global shortcut, type a title, press Enter, keep working.
3. **Focus start:** pick a study task, start a 90-minute timebox, see the circular timer.
4. **Evening:** end-of-day review, compare estimates with actuals, decide what to do with unfinished tasks.
5. **Week end:** report of time spent on exam study, content creation, and development.
6. **Switch language and theme:** change `fa` to `en` and Dark to System with no layout breakage and no flash.
