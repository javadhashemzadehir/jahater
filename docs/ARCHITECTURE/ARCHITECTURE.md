# Architecture

## Overview

Self Planner is a **Tauri 2** desktop app embedding a **Next.js** frontend. All data is stored locally through the Rust host. There is no cloud backend. The structure deliberately mirrors [JabeX](https://github.com/javadhashemzadehir/JabeX) so patterns, components and tooling can be reused.

```
┌─────────────────────────────────────────┐
│              Tauri Window               │
│  ┌───────────────────────────────────┐  │
│  │     Next.js frontend (webview)    │  │
│  │  UI · i18n · theme · Zustand      │  │
│  └───────────────┬───────────────────┘  │
│                  │ IPC (commands/events)│
│  ┌───────────────▼───────────────────┐  │
│  │ Rust backend (Clean Architecture) │  │
│  │  commands → application → domain  │  │
│  │           ↓                       │  │
│  │      infrastructure               │  │
│  └───────────────┬───────────────────┘  │
│                  │                      │
│  planner.sqlite · backups/              │
└─────────────────────────────────────────┘
```

## Repository structure (planned)

| Path | Role |
| --- | --- |
| `apps/desktop/frontend` | Next.js App Router UI (static export) |
| `apps/desktop/src-tauri` | Tauri + Rust backend |
| `packages/types` | Shared TypeScript contracts and Zod schemas |
| `docs/` | Product, architecture, ADRs (one doc per folder) |
| `scripts/` | Dev seed, packaging, doc screenshots |
| `.github/` | CI, release, security workflows, issue templates |

pnpm workspace: `apps/desktop`, `apps/desktop/frontend`, `packages/*`. Packages are scoped `@selfplanner/*`.

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Desktop runtime | Tauri 2 | Tray, dialogs, notifications, global shortcut plugins |
| Frontend | Next.js App Router, React 19, TypeScript, `output: "export"`, React Compiler | No server-only features. Mirror JabeX versions at scaffold time (JabeX currently pins Next 16.4.0 and React 19.3.0). |
| Styling | Tailwind CSS v4 with CSS variable tokens | OKLCH tokens in `:root` and `.dark` |
| Components | shadcn/ui (New York) on Radix | No other UI kits |
| Theming | `next-themes`, class strategy, default `system` | See [FRONTEND.md](../FRONTEND/FRONTEND.md) |
| i18n | JSON dictionaries, Zustand store | `fa` default RTL, `en` LTR |
| State | Zustand per feature store | |
| Validation | Zod 4 (TS) and Rust validation at the IPC boundary | |
| Motion | `framer-motion` with `MotionConfig reducedMotion="user"` | |
| Toasts / command palette | `sonner`, `cmdk` | |
| Drag and drop | `@dnd-kit` (new vs JabeX) | Needs keyboard sensors |
| Calendar | `Intl` with `fa-IR-u-ca-persian` for display, `date-fns-jalali` or equivalent for arithmetic | Display only; storage is Gregorian ISO |
| Database | SQLite through `rusqlite` (bundled) and `refinery` migrations | No ORM |
| Rust utilities | `uuid` (v7), `chrono`, `thiserror`, `tracing`, `directories`, `parking_lot`, `tokio` | Same as JabeX |
| Tests | Vitest and Testing Library; `cargo test` | |

## Frontend layers

- `app/`: routes and layouts
- `components/`: shell, providers, shared presentational UI, `ui/` (shadcn)
- `features/`: tasks, board, matrix, timeline, timer, reports, review, settings, trash
- `hooks/`: `use-locale`, `use-is-client`, `use-is-tauri`
- `lib/`: i18n, fonts, Tauri IPC wrappers, utilities, date helpers
- `locales/`: `fa/common.json`, `en/common.json`
- `styles/`: `globals.css` (tokens, Tailwind theme mapping)

## Backend layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| IPC | `commands/` | Thin adapters: validate, call service, map errors |
| Application | `application/` | Use cases and services |
| Domain | `domain/` | Entities, timer state machine, repository ports, errors |
| Infrastructure | `infrastructure/` | SQLite, filesystem, repository adapters, autostart |
| Desktop | `desktop/` | Tray, window, notifications, global shortcuts |
| Shared | `shared/` | UUIDv7, time helpers, clock trait |

Dependency rule: inward only. `domain` never imports `rusqlite` or Tauri. See [BACKEND.md](../BACKEND/BACKEND.md).

## Cross-cutting concerns

- **i18n:** `fa` default with RTL, `en` with LTR; `lang` and `dir` on `<html>`.
- **Theming:** Light, Dark, System via `next-themes`; tokens only.
- **Privacy:** least-privilege Tauri capabilities; strict CSP; no telemetry.
- **Time:** all timestamps UTC ISO 8601; timers derive from absolute timestamps ([ADR 006](../ADR/006-timer-engine/006-timer-engine.md)).
- **Soft delete:** nothing is hard-deleted by normal actions; Trash restores.
- **Revision:** each entity has a monotonic `revision` for possible future sync.
- **Desktop shell:** tray and window visibility live in `desktop/`, not in domain services.

## Key flows

**Quick capture:** global shortcut (Rust) → show small capture window → `create_task` → `tasks://changed` event → open views update.

**Timer:** UI calls `start_timer` → service writes a `time_entries` row → Rust emits `timer://tick` once per second for display → on target reached, Rust sends a system notification and emits `timer://finished`. The UI never owns the timer.

**Drag between quadrants:** UI calls `update_task` with new flags → backend increments `revision` → `tasks://changed` → Kanban, list and timeline refresh from the same data.

## Decisions

See [ADR/](../ADR/). Open questions:

- Hand-written `packages/types` (JabeX approach) vs generated types from Rust.
- Exact calendar library and its quality in RTL timeline layouts.
- Linux behaviour of global shortcuts under Wayland.
- Whether Next's inline theme bootstrap script passes the release CSP (Tauri rewrites CSP hashes for built HTML; verify in a release build).
