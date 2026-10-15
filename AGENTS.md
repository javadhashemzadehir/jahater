# AGENTS.md

Instructions for coding agents and contributors working on Self Planner.

> **Status:** the repository is in the planning stage. Paths and commands below describe the planned scaffold and mirror [JabeX](https://github.com/javadhashemzadehir/JabeX). If a path or command does not exist yet, check `docs/ROADMAP/ROADMAP.md` for the phase that introduces it, and do not invent it.

## What this project is

Self Planner is a private, offline-first desktop planner for ADHD brains. One task model drives six views: timeline, time tracking, timeboxing, Eisenhower matrix, to-do list and Kanban. Persian (RTL, default) and English (LTR) are both first-class. Themes are Light, Dark and System.

Read in this order before non-trivial work:

1. `docs/PRODUCT/PRODUCT.md`
2. `docs/ARCHITECTURE/ARCHITECTURE.md`
3. `docs/FRONTEND/FRONTEND.md` (i18n, theming, fonts)
4. `docs/BACKEND/BACKEND.md` and `docs/DATABASE/DATABASE.md`
5. `docs/ADR/` for the reasoning behind decisions

## Stack

- Tauri 2 (Rust) desktop host
- Next.js App Router, static export (`output: "export"`), React 19, TypeScript, React Compiler
- Tailwind CSS v4, shadcn/ui (New York) on Radix for all UI, plus shadcn-compatible third-party components where the official set has no match (ADR 009), OKLCH CSS-variable tokens
- `next-themes` for Light / Dark / System
- Zustand stores, Zod at boundaries
- SQLite through `rusqlite` and `refinery`, no ORM
- pnpm workspace (`apps/desktop`, `apps/desktop/frontend`, `packages/*`)

## Repository map (planned)

| Path | Purpose |
| --- | --- |
| `apps/desktop/frontend/src/app` | Routes and layout |
| `apps/desktop/frontend/src/components` | Shell, providers, shared UI, `ui/` (shadcn) |
| `apps/desktop/frontend/src/features` | tasks, board, matrix, timeline, timer, reports, review, settings, trash, capture |
| `apps/desktop/frontend/src/lib` | i18n, fonts, Tauri wrappers, date formatting |
| `apps/desktop/frontend/src/locales/{fa,en}/common.json` | Translation dictionaries |
| `apps/desktop/src-tauri/src/{commands,application,domain,infrastructure,desktop,shared}` | Rust layers |
| `apps/desktop/src-tauri/src/infrastructure/database/migrations` | `V{n}__name.sql` |
| `packages/types` | Shared TypeScript contracts and Zod schemas |
| `docs/` | Documentation; one folder per document |

## Commands (once scaffolded)

```bash
pnpm install
pnpm dev               # Next dev server (browser, no IPC)
pnpm tauri:dev         # Desktop app
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# From apps/desktop/src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

## Hard rules

### Internationalization

- Every user-facing string comes from `useTranslations()`. No literals in JSX, toasts, `aria-label`, tooltips, titles or error messages.
- Add each new key to **both** `locales/fa/common.json` and `locales/en/common.json` in the same change. The `fa` file defines the dictionary type.
- Use Tailwind **logical** utilities: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`. Do not use `left`, `right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right` for layout.
- Mirror directional icons in RTL (`rtl:rotate-180`). Do not mirror clocks, play icons or logos.
- Format dates and durations only through the shared formatter module, passing the locale. `fa` shows Jalali, `en` shows Gregorian. Storage is always Gregorian ISO 8601 UTC.
- User-entered text of unknown script: `dir="auto"` or `<bdi>`.

### Theming

- Support all three modes: Light, Dark, System. Default is System.
- Use design tokens only (`bg-background`, `text-muted-foreground`, `--timer-*`, `--quadrant-*`). **No hex, `rgb()` or `hsl()` in components.** New tokens must be defined for both `:root` and `.dark` in `globals.css`.
- Never rely on colour alone for meaning.
- Do not add transitions on theme change (`disableTransitionOnChange`).
- Keep `suppressHydrationWarning` on `<html>`; guard client-only theme UI with `useIsClient()`.

### UI

- **No custom-built components.** Every control, surface, list row, message and overlay comes from `components/ui`: official shadcn/ui first, then shadcn-compatible third-party components (shadcn.io, shadcn studio, libraries such as cmdk, sonner, vaul, recharts). See ADR 009.
- Feature code only composes those components. Plain HTML is for layout and text only: no raw `button`, `input`, `select`, `textarea`, `table`, hand-styled cards or `role="alert"` paragraphs. If nothing fits, record an open item in `docs/FRONTEND/FRONTEND.md` instead of writing a component.
- Destructive actions confirm through `AlertDialog`.
- Third-party components are copied in and adapted before merge: tokens, logical utilities, `useTranslations()`, keyboard, reduced motion, no network. Record the source in `docs/FRONTEND/FRONTEND.md`.
- Do not add full design systems with their own theme (MUI, Chakra, Persian UI kits).
- Every drag-and-drop action needs a keyboard alternative.
- Respect reduced motion (`MotionConfig reducedMotion="user"`).
- Keep copy neutral and shame-free: no "failed", no broken-streak messaging.

### Frontend architecture

- Static export only. No route handlers, server actions, SSR-only APIs or runtime server features.
- Backend is the source of truth. Feature stores refetch on `tasks://changed`; do not keep view-specific copies of order or status.
- Validate IPC payloads and responses with Zod in `lib/tauri.ts`.
- One task model, many views (ADR 007): a drag changes the task's own fields.

### Rust architecture

- Dependency direction is inward only: `commands` → `application` → `domain`; `infrastructure` implements domain ports. `domain` must not import `rusqlite` or Tauri.
- Commands stay thin: validate, call a service, map errors.
- No ORM. SQL lives in `infrastructure/repositories/queries`, row mapping in `mappers`, multi-step writes use `with_transaction`.
- Errors are `thiserror` enums mapped to `{ code, message_key }`. Never send free-text error strings to the UI.
- Timers (ADR 006): derive elapsed time from absolute timestamps; inject a `Clock`; allow one running entry; persist state changes immediately; send notifications from Rust.
- Soft delete via `deleted_at`; bump `revision` on every update.
- Released migrations are immutable. Add a new `V{n}__name.sql` instead of editing an old one.

### Privacy

- No telemetry, analytics, crash reporting, remote fonts, CDN assets or outbound network calls in v0.x.
- Keep Tauri capabilities minimal and the CSP strict.
- Seed and screenshot scripts must set `SELF_PLANNER_DATA_DIR` to a repo-local temp directory and refuse the real app-data path.

## Do not

- Add notes, wiki, team features, accounts or cloud sync.
- Auto-reschedule a user's plan without confirmation.
- Make medical or treatment claims in code, copy or docs.
- Present unverified research as established fact. Use the evidence levels in `docs/RESEARCH/TIME_MANAGEMENT_RESEARCH.md`.
- Copy JabeX-specific features (Leitner, TipTap, ink, speech) when porting shared code.
- Edit, delete or reorder existing ADRs; add a new one to supersede.

## Definition of done

A change is done when:

1. `pnpm lint`, `pnpm typecheck` and `pnpm test` pass.
2. If Rust changed: `cargo fmt --all -- --check`, `cargo clippy ... -D warnings` and `cargo test` pass.
3. New strings exist in both `fa` and `en`.
4. UI changes were checked in all six combinations: `fa`/`en` × Light/Dark/System (see `docs/TESTING/TESTING.md`).
5. Keyboard-only use of the changed UI works.
6. Docs and, where a decision changed, an ADR are updated.

## Next.js note

Next.js changes quickly and may differ from what you remember. Read the relevant guide in `node_modules/next/dist/docs/` for the installed version before writing Next-specific code. `next dev` may add an auto-managed agent-rules block to `apps/desktop/frontend/AGENTS.md`; keep it when it appears.

## Git and commits

- Branching and Conventional Commits: `docs/GIT_WORKFLOW/GIT_WORKFLOW.md`.
- Agent commit, merge and tree-cleanup rules: `docs/AGENT_GIT_GUIDE/AGENT_GIT_GUIDE.md`. Run `sh scripts/git/install-hooks.sh` once per clone.
- Branch from `develop`; never commit directly to `main`.
- Commit messages and PR descriptions must **not** contain AI-assistant attribution trailers or assistant identities. This mirrors the JabeX policy and is the default for this repo. Human `Co-authored-by` trailers are fine.
- Keep commits small and focused.

## When unsure

Prefer the smaller change, follow the JabeX pattern if one exists, and record the question as an open item in the relevant doc instead of guessing.
