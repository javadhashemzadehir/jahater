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

- [ ] Create repo, licence, README, `.editorconfig`, `.gitattributes`
- [ ] pnpm workspace (`apps/desktop`, `apps/desktop/frontend`, `packages/*`)
- [ ] Tauri 2 + Next.js static export boots a blank window
- [ ] Verify font licences or switch to OFL fonts (NFR-12)

**Done when:** `pnpm tauri:dev` opens an empty window and `pnpm build` produces the static export.

### S0.2 Shell, i18n, theming

- [ ] Port from JabeX: shell, providers, theme, i18n, fonts, shadcn setup, token file (no JabeX-specific features)
- [ ] `fa` (RTL, default) and `en` (LTR) dictionaries wired through `useTranslations()`
- [ ] Light, Dark, System switcher; no flash of wrong theme
- [ ] Shared date formatter stub (Jalali for `fa`, Gregorian for `en`)

**Done when:** the six locale/theme combinations render correctly on the empty shell.

### S0.3 Rust skeleton

- [ ] Layers: `commands`, `application`, `domain`, `infrastructure`, `desktop`, `shared`
- [ ] Database open, WAL mode, refinery `V1__` migration
- [ ] One command end to end (save and read a task) with Zod-validated IPC in `lib/tauri.ts`
- [ ] Error enum mapped to `{ code, message_key }`

**Done when:** a task is saved and read back through the full stack.

### S0.4 CI and CSP

- [ ] CI: lint, typecheck, test, build, `cargo fmt`, `clippy`, `cargo test`
- [ ] Check the theme bootstrap against the release CSP
- [ ] Record real durations of S0.1 to S0.3 for later estimates

**Done when (Phase 0):** the app runs on the author's machine, a task is saved, CI is green, and the six combinations render correctly.

---

## Phase 1: tasks and views

### S1.1 Task model and Trash

- [ ] Task CRUD with title, notes, project, tags
- [ ] `is_urgent`, `is_important`, status (`todo`, `doing`, `done`, `archived`), estimate, actual
- [ ] Soft delete via `deleted_at`, `revision` bump on update
- [ ] Trash view with restore and hold-to-confirm permanent delete
- [ ] `tasks://changed` event emitted from Rust

### S1.2 List view and store sync

- [ ] List view on the single task model (ADR 007)
- [ ] Zustand feature store that refetches on `tasks://changed`
- [ ] Projects and tags management

### S1.3 Kanban

- [ ] Kanban columns by status; drag changes the task's own `status`
- [ ] Keyboard alternative for every drag action
- [ ] RTL drag-and-drop verified in `fa` and `en`

### S1.4 Eisenhower matrix

- [ ] Four quadrants with `--quadrant-*` tokens and non-colour cues
- [ ] Drag changes the two flags; keyboard alternative

### S1.5 Quick capture

- [ ] Global shortcut opens a title-only capture without the main window
- [ ] Enter saves, Escape dismisses, focus returns to the previous app

**Done when (Phase 1):** list, Kanban and matrix stay in sync on one dataset.

---

## Phase 2: time

### S2.1 Timer engine (Rust)

- [ ] Injected `Clock`; elapsed derived from absolute timestamps (ADR 006)
- [ ] One running entry at a time; start, pause, stop persisted immediately
- [ ] Fake-clock tests including sleep and suspend cases

### S2.2 Tracker, timebox, visual timer

- [ ] Tracker UI for start, pause, stop
- [ ] Timebox with target duration and countdown
- [ ] Circular visual timer using `--timer-*` tokens; respects reduced motion

### S2.3 Daily timeline

- [ ] Time blocks with start and duration on a task
- [ ] Draggable blocks, now line, keyboard alternative
- [ ] Jalali/Gregorian display through the shared formatter

### S2.4 Notifications and recovery

- [ ] Notifications from Rust for block start and timebox end
- [ ] Orphan-timer recovery on startup

**Done when (Phase 2):** a real day is planned and tracked, including a laptop sleep during a timer.

---

## Phase 3: reports and ADHD support

### S3.1 Estimate vs actual report

- [ ] Report by day, project and tag

### S3.2 Capacity and reviews

- [ ] Daily capacity setting and overload warning (never auto-reschedules)
- [ ] Morning and evening review, each under 2 minutes

### S3.3 Focus and transitions

- [ ] Focus mode showing only the current task and timer
- [ ] Buffer and transition block kinds

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
| S0.1 | | | | |

## Not in any sprint

Everything under "Later" in the roadmap, plus FR-03, 07, 08, 14, 24, 31, 46, 47, 51, 54 (Should-priority items not in the MVP definition). Pull one in only by replacing something of equal size and recording the change here.
