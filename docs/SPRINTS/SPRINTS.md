# Sprints

Sprint plan derived from [ROADMAP.md](../ROADMAP/ROADMAP.md) and [REQUIREMENTS.md](../REQUIREMENTS/REQUIREMENTS.md). The roadmap phases stay the source of truth for scope; this document only slices them into sprint-sized goals.

## How to use this plan

- **No durations.** The roadmap deliberately has no time estimates. Sprint length is a personal setting: run Sprint 0, record the real durations of its items, then fix a sprint length and re-slice if a sprint is too large.
- **One active sprint at a time.** The exam study block is fixed and sits outside every sprint.
- **New ideas go to "Later"** in the roadmap, not into the current sprint.
- **Every sprint ends with a review:** what moved, how accurate were the estimates, what is next. Record the numbers in the sprint's retro line below.
- **Every sprint's change must meet the Definition of Done** in [AGENTS.md](../../AGENTS.md): lint, typecheck, test, Rust checks, strings in both `fa` and `en`, six locale/theme combinations, keyboard use, docs/ADR.

## Overview

| Sprint | Phase | Goal | Requirements |
| --- | --- | --- | --- |
| S0.1 | 0 | Repo and workspace skeleton | NFR-11, NFR-12 |
| S0.2 | 0 | Shell, i18n, theming on an empty app | FR-40 to 44, NFR-08, NFR-09 |
| S0.3 | 0 | Rust skeleton and one command end to end | NFR-06 |
| S0.4 | 0 | CI and release-CSP check | NFR-11 |
| S1.1 | 1 | Task model, CRUD, soft delete, Trash | FR-01, 04, 05, 06, 09 |
| S1.2 | 1 | List view and shared store sync | FR-10, 15 |
| S1.3 | 1 | Kanban with keyboard alternative | FR-11, 16 |
| S1.4 | 1 | Eisenhower matrix | FR-12, 16 |
| S1.5 | 1 | Quick capture and global shortcut | FR-02 |
| S2.1 | 2 | Timer engine in Rust | FR-23, NFR-05 |
| S2.2 | 2 | Tracker, timebox, circular timer UI | FR-21, 22, 23 |
| S2.3 | 2 | Daily timeline | FR-13, 20 |
| S2.4 | 2 | Notifications and orphan-timer recovery | FR-50, NFR-05 |
| S3.1 | 3 | Estimate vs actual report | FR-26 |
| S3.2 | 3 | Capacity, overload warning, reviews | FR-30, 32 |
| S3.3 | 3 | Focus mode, buffer and transition blocks | FR-33, 25 |
| S3.4 | 3 | Export, import, backups; MVP trial | FR-52, 53 |
| S4.1 | 4 | Installers, docs, v0.1.0 | NFR-10, NFR-11 |

---

## Phase 0: scaffold

### S0.1 Repo and workspace skeleton

- [x] Create repo, licence, README, `.editorconfig`, `.gitattributes`
- [x] pnpm workspace (`apps/desktop`, `apps/desktop/frontend`, `packages/*`)
- [x] Tauri 2 + Next.js static export boots a blank window (release build runs; window not inspected visually)
- [x] Verify font licences or switch to OFL fonts (NFR-12): switched to Vazirmatn and Comfortaa

**Done when:** `pnpm tauri:dev` opens an empty window and `pnpm build` produces the static export.

### S0.2 Shell, i18n, theming

- [x] Port from JabeX: shell, providers, theme, i18n, shadcn setup, token file (no JabeX-specific features). Ported from the local JabeX clone: hold-to-confirm button, input, theme provider, `components.json`. Fonts stay Vazirmatn and Comfortaa (NFR-12) instead of JabeX's Yekan.
- [x] `fa` (RTL, default) and `en` (LTR) dictionaries wired through `useTranslations()`
- [x] Light, Dark, System switcher; no flash of wrong theme. The `next-themes` bootstrap is inline in the export and runs before paint. Not yet checked visually in the desktop window.
- [x] Shared date formatter stub (Jalali for `fa`, Gregorian for `en`)

**Done when:** the six locale/theme combinations render correctly on the empty shell.

### S0.3 Rust skeleton

- [x] Layers: `commands`, `application`, `domain`, `infrastructure`, `desktop`, `shared`
- [x] Database open, WAL mode, refinery `V1__` migration
- [ ] One command end to end (save and read a task) with Zod-validated IPC in `lib/tauri.ts`. Covered by Rust tests and a release launch; the save-and-read click through the UI is not yet run.
- [x] Error enum mapped to `{ code, message_key }`

**Done when:** a task is saved and read back through the full stack.

### S0.4 CI and CSP

- [x] CI: lint, typecheck, test, build, `cargo fmt`, `clippy`, `cargo test`. All three jobs (`frontend`, `rust`, `release-csp`) passed on PR #2.
- [x] Check the theme bootstrap against the release CSP. The release build passes with the CSP. `script-src` allows `'unsafe-inline'` for the static export; see [ADR 008](../ADR/008-release-csp-script-policy/008-release-csp-script-policy.md). Hash-based strict CSP is deferred. Webview console not yet inspected.
- [ ] Record real durations of S0.1 to S0.3 for later estimates

**Done when (Phase 0):** the app runs on the author's machine, a task is saved, CI is green, and the six combinations render correctly.

---

## Phase 1: tasks and views

### S1.1 Task model and Trash

- [x] Task CRUD with title and notes (V2 adds `notes`, `estimate_minutes`). Project and tags are deferred to S1.2, where the `projects` and `tags` tables arrive
- [x] `is_urgent`, `is_important`, status (`todo`, `doing`, `done`, `archived`), estimate. Actual time is not a column: it is derived from `time_entries` in Phase 2 (see DATABASE.md sample query)
- [x] Soft delete via `deleted_at`, `revision` bump on update
- [x] Trash view with restore and hold-to-confirm permanent delete, reached from the Tasks/Trash switch
- [x] `tasks://changed` event emitted from Rust after every task write

Backend and IPC: `create_task`, `update_task` (partial patch, `null` clears), `trash_task`, `restore_task`, `purge_task` (trashed rows only), `list_tasks`, `list_trashed_tasks`. Domain tests, repository tests and service tests cover the rules; Zod tests cover the IPC boundary.

### S1.2 List view and store sync

- [x] List view on the single task model (ADR 007): done checkbox, inline editor (title, notes, estimate, project, tags, urgent, important), project and tag filters, move to Trash
- [x] Zustand feature store that refetches on `tasks://changed` (`features/tasks/task-store.ts`, mounted once by `useTaskSync`)
- [x] Projects and tags management (create, rename, hold-to-confirm delete). Deleting only unlinks; tasks are kept (V3 migration)

Not yet checked: the six locale/theme combinations and a click-through in the desktop window.

### S1.3 Kanban

- [x] Kanban columns by status (To do, Doing, Done; archived is hidden); drag changes the task's own `status` through `@dnd-kit/core`
- [x] Keyboard alternative for every drag action: dnd-kit keyboard sensor with localized announcements, plus a "Move to column" select on every card
- [ ] RTL drag-and-drop verified in `fa` and `en`. Not run yet: needs a click-through in the desktop window. Column order follows the document direction, so RTL mirrors without extra code

### S1.4 Eisenhower matrix

- [x] Four quadrants with `--quadrant-*` tokens and non-colour cues (icon, title, hint text, axis labels)
- [x] Drag changes the two flags (`isUrgent`, `isImportant`); keyboard alternative: dnd-kit keyboard sensor plus a "Move to quadrant" select on each card. Done and archived tasks are not shown

Not yet checked visually: the six locale/theme combinations.

### S1.5 Quick capture

- [ ] Global shortcut opens a title-only capture without the main window
- [ ] Enter saves, Escape dismisses, focus returns to the previous app

**Done when (Phase 1):** list, Kanban and matrix stay in sync on one dataset.

---

## Phase 2: time

### S2.1 Timer engine (Rust)

- [x] Injected `Clock`; elapsed derived from absolute timestamps (ADR 006): `domain/timer.rs`
- [x] One running entry at a time (partial unique index plus `replace_running` in one transaction); start, pause, resume, stop persisted immediately (V4 migration)
- [x] Fake-clock tests including sleep (an eight-hour gap with no ticks) and a system clock moved backwards (elapsed clamps to zero)

Backend and IPC: `start_timer`, `pause_timer`, `resume_timer`, `stop_timer`, `get_active_timer`; events `timer://changed`, `timer://tick` (every second, display only) and `timer://finished` (once per entry when a target is reached). No UI yet: S2.2.

### S2.2 Tracker, timebox, visual timer

- [x] Tracker UI for start, pause, resume, finish (Timer view, optional task link). Pomodoro and Flowtime modes are available too, since a mode is data on the entry
- [x] Timebox with target duration and countdown, then calm overtime (`+mm:ss`) past the target
- [x] Circular visual timer using `--timer-*` tokens. The phase (running, almost at the target, paused, target reached) is also written as text in a `role="status"` line, so colour is not the only cue. The ring has no animation, so there is nothing to reduce

Display values are recomputed from timestamps (`timer-math.ts`, mirrors the Rust formula), so a throttled webview never changes the numbers. Not yet checked visually: the six locale/theme combinations.

### S2.3 Daily timeline

- [x] Time blocks with start and duration, linked to a task or free-standing (V5 migration; `create_block`, `update_block`, `delete_block`, `list_blocks`). Overlapping blocks sit side by side
- [x] Draggable blocks (snap to 5 minutes, kept inside the day), a "Now" line on today, and a keyboard alternative: dnd-kit keyboard sensor plus an edit panel with start time, length and 15-minute earlier/later buttons
- [x] Jalali/Gregorian display through the shared formatter (`formatDate`, `formatTime`); day navigation arrows mirror in RTL

Blocks never move on their own. Not yet checked visually: the six locale/theme combinations and an RTL drag.

### S2.4 Notifications and recovery

- [ ] Notifications from Rust for block start and timebox end. **Blocked:** needs `tauri-plugin-notification`, and crates.io was unreachable from the build machine when this sprint ran, so the crate could not be added. `timer://finished` already fires once per reached target; the Rust-side sink is what is missing
- [x] Orphan-timer recovery on startup: the running timer is marked alive every 5 seconds (`last_seen_at`, V6). A timer found running (not paused) at launch opens a dialog: stop at the last seen time, keep it running, or discard. Closing the dialog leaves the timer as it is. Covered by service tests for all three choices, a paused timer and the normal stop path

**Done when (Phase 2):** a real day is planned and tracked, including a laptop sleep during a timer.

---

## Phase 3: reports and ADHD support

### S3.1 Estimate vs actual report

- [x] Report by task, day, project and tag over today, 7 or 30 days: estimate, actual and difference per group, with a total. The backend returns finished entries with worked seconds (`list_tracked_entries`, pauses excluded); grouping is a pure, tested function (`report-model.ts`)
- Rules worth knowing: an entry belongs to the day it started; a task's estimate counts once per group (on its first worked day in the day view); a task with several tags appears under each, so tag rows can exceed the total. The wording is "difference", never "over" or "late"

Not yet checked visually: the six locale/theme combinations.

### S3.2 Capacity and reviews

- [x] Daily capacity setting (Settings view, stored in `app_meta`, default 6 hours) and an overload heads-up on the timeline: a capacity bar with a `role="meter"`, and when planned work exceeds capacity a plain sentence ("Nothing has been moved. You decide.") with an info icon. Only task and event blocks count; buffers, transitions and free time do not. Nothing is ever rescheduled automatically
- [x] Morning and evening check-in (Check-in view, V7 `daily_reviews`): morning is an energy level, the day's load and one question; evening is one question. Every field is optional, so a check-in can be a single tap

Not yet checked visually: the six locale/theme combinations.

### S3.3 Focus and transitions

- [x] Focus mode (button next to the view switcher): only the current task and the timer, with start, pause, finish, mark done and one way out. The current task is the timer's task, else the planned block covering now, else a task marked doing (`pickCurrentTask`, tested)
- [x] Buffer, transition, free-time and event block kinds on the timeline: a type selector when planning, dashed outline plus a type word on the block (not colour alone), and "Add a 10 minute buffer after" in the block editor. They do not count toward the daily capacity

Not yet checked visually: the six locale/theme combinations.

### S3.4 Data safety and MVP trial

- [ ] JSON export and import
- [ ] Automatic daily backup with rotation
- [ ] Two-week daily-use trial with no fallback to another tool

**Done when (MVP):** two weeks of daily use with no fallback to another tool.

---

## Phase 4: release

### S4.1 Release

- [ ] Windows installers (NSIS and MSI), Linux build in CI
- [ ] User and developer docs, contributing guide, issue templates
- [ ] v0.1.0 on GitHub Releases
- [ ] Intro video

---

## Retro log

Fill in after each sprint. Keep it factual and shame-free.

| Sprint | Planned | Actual | What moved | Next |
| --- | --- | --- | --- | --- |
| S0.1 | Repo and workspace skeleton | Not timed (author to record) | pnpm workspace, Next static export, Tauri 2 window, icon set, OFL fonts chosen, MIT LICENSE added | S0.2 |
| S0.2 | Shell, i18n, theming | Not timed (author to record) | fa/en dictionaries, Zustand locale store, Light/Dark/System with next-themes, RTL direction sync, date formatter stub, shadcn-style button | S0.3 |
| S0.3 | Rust skeleton | Not timed (author to record) | Layers in place, WAL + refinery V1 (`tasks`), `create_task` / `list_tasks` with Zod boundary and `{ code, message_key }` errors | S0.4 |
| S0.4 | CI and CSP | Not timed (author to record) | CI workflow (frontend, Rust, release build), release CSP in `tauri.conf.json` | Phase 1 (S1.1) |

## Not in any sprint

Everything under "Later" in the roadmap, plus FR-03, 07, 08, 14, 24, 31, 46, 47, 51, 54 (Should-priority items not in the MVP definition). Pull one in only by replacing something of equal size and recording the change here.
