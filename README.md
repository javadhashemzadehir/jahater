# Self Planner

Private, offline-first planner for ADHD brains. Timeline, time tracking, timeboxing, Eisenhower matrix, to-do list and Kanban, all on one task model.

> **Status:** planning. This repository currently holds documentation only. Commands and paths below describe the planned layout.

## Goals

- Capture a task in under 5 seconds from anywhere on the desktop.
- Plan a day in under 2 minutes.
- Keep all data on the device. No account, no cloud, no telemetry.

## Constraints

- Tasks and time only. No notes app, no project-management suite, no team features.
- Persian and English are both first-class (`fa` RTL default, `en` LTR).
- Three theme modes: Light, Dark, System.
- Built for the author's own ADHD workflow first.

## Stack

Foundation:

| Layer | Choice |
| --- | --- |
| Desktop host | Tauri 2 (Rust) |
| UI | Next.js App Router, static export, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), OKLCH design tokens |
| Theming | `next-themes` (Light / Dark / System) |
| i18n | JSON dictionaries, Zustand locale store, `lang` and `dir` on `<html>` |
| State | Zustand, Zod at boundaries |
| Storage | SQLite via `rusqlite` + `refinery` migrations |
| Workspace | pnpm monorepo |

## Documentation

Start at [docs/README.md](./docs/README.md). Agents and contributors working on code should read [AGENTS.md](./AGENTS.md) first.

## License

MIT (to be confirmed before the first public release).
