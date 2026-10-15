# Roadmap

Guiding rule: one active build project at a time, with the exam study block as a fixed daily pillar. Time estimates are intentionally absent. Record real durations in Phase 0 and use them to estimate the rest (the same loop the app is meant to teach).

## MVP definition

The MVP is reached when one full workday and study plan can be run in Self Planner alone. It needs:

- Tasks with urgent and important flags, status and estimate (FR-01, 04, 05, 06)
- List, Kanban, Matrix and daily Timeline views on one model (FR-10 to 13, 15, 16)
- Time blocks, timebox, visual timer and tracker (FR-20 to 23)
- Estimate vs actual report (FR-26)
- Bilingual UI, RTL/LTR, Jalali display (FR-40 to 42, 45)
- Light, Dark and System themes (FR-43, 44)
- Quick capture with a global shortcut and notifications (FR-02, 50)
- Export and import (FR-52)

## Phases

### Phase 0: scaffold

- [ ] Create repo, licence, README, `.editorconfig`, `.gitattributes`
- [ ] pnpm workspace; Tauri 2 + Next.js static export
- [ ] Shell, providers, theme, i18n, fonts, shadcn setup, token file
- [ ] Verify font licences or switch to OFL fonts
- [ ] Rust skeleton: layers, database open, refinery V1, one command end to end
- [ ] Both locales and all three theme modes working on the empty shell
- [ ] CI: lint, typecheck, test, build, cargo fmt/clippy/test
- [ ] Check the theme bootstrap against the release CSP
- **Done when:** the app runs on the author's machine, a task is saved, and the six locale/theme combinations render correctly.

### Phase 1: tasks and views

- [ ] Task CRUD, projects, tags, soft delete and Trash
- [ ] List view
- [ ] Kanban with drag and drop and keyboard alternative
- [ ] Eisenhower matrix
- [ ] Quick capture with global shortcut
- **Done when:** three views stay in sync on one dataset.

### Phase 2: time

- [ ] Timer engine in Rust with fake-clock tests
- [ ] Tracker, timebox, circular visual timer
- [ ] Daily timeline with draggable blocks and now line
- [ ] Notifications from Rust
- [ ] Orphan-timer recovery on startup
- **Done when:** a real day is planned and tracked, including a laptop sleep during a timer.

### Phase 3: reports and ADHD support

- [ ] Estimate vs actual report
- [ ] Overload warning and daily capacity setting
- [ ] Morning and evening review
- [ ] Focus mode
- [ ] Buffer and transition blocks
- [ ] Export, import, automatic backups
- **Done when (MVP):** two weeks of daily use with no fallback to another tool.

### Phase 4: release

- [ ] Windows installers (NSIS and MSI), Linux build in CI
- [ ] User and developer docs, contributing guide, issue templates
- [ ] v0.1.0 on GitHub Releases
- [ ] Intro video

### Later

- Personal estimate factor (FR-27)
- Recurring tasks, weekly view
- Free-time block
- Body doubling room
- Automatic activity tracking (idea from ActivityWatch)
- Optional encrypted sync
- Mobile

## Risks

| Risk | Likelihood | Response |
| --- | --- | --- |
| Scope creep | High | New ideas go to "Later", not to the current phase |
| Static-export friction in Next | Low to medium | Same stack the author already ships, which works |
| RTL bugs in drag-and-drop | Medium | Test every interaction in `fa` and `en` from Phase 1 |
| Timer drift or corruption after sleep | Medium | Absolute timestamps; tests in Phase 2 |
| CSP blocking theme script in release | Low to medium | Check in Phase 0 |
| Font licence blocks bundling | Medium | Decide in Phase 0, fall back to OFL fonts |
| Splitting attention across projects | High | One build project at a time; exam block is fixed |

## Weekly rhythm (suggestion)

- Fixed exam-study blocks that do not move.
- A short, regular development block.
- One block for recording and editing content.
- Weekly review: what moved, how accurate were estimates, what is next.
