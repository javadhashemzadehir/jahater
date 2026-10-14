# Development guide

> The repository is in the planning stage. This guide describes the intended workflow, copied from JabeX and adapted. Update it as the scaffold lands.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Rust stable via [rustup](https://rustup.rs/)
- Platform dependencies for Tauri ([Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/))

| OS | Required |
| --- | --- |
| Windows | Visual Studio Build Tools with the Desktop development with C++ workload, plus WebView2 (usually preinstalled on Windows 10 and 11). MSI installers also need the VBScript optional feature. |
| macOS | Xcode Command Line Tools |
| Linux | WebKitGTK and related packages (Ubuntu: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`). Keep versions aligned with CI workflows. |

## Setup

```bash
pnpm install
cp .env.example .env
```

`.env.example` (no secrets, no cloud keys):

```
NEXT_PUBLIC_APP_NAME=Self Planner
NEXT_PUBLIC_DEFAULT_LOCALE=fa
# SELF_PLANNER_DATA_DIR=./.tmp/dev-data
```

## First run

1. Install prerequisites.
2. `pnpm install`, copy `.env.example` to `.env`.
3. `pnpm tauri:dev`.
4. Check: window opens, sidebar navigates, a task can be created, the language and theme switchers work.

Frontend only (no Rust): `pnpm dev` then open `http://localhost:3000`. IPC-backed features need the desktop shell.

## Commands

```bash
pnpm dev               # Next dev server
pnpm lint
pnpm typecheck
pnpm test
pnpm build             # static export
pnpm tauri:dev
pnpm tauri:build

# Seed fixtures into the dev data directory only
pnpm db:seed
pnpm db:unseed
```

Rust, from `apps/desktop/src-tauri`:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

## Workspace layout

- `apps/desktop`: Tauri CLI entry (must see `src-tauri/`)
- `apps/desktop/frontend`: Next.js UI
- `apps/desktop/src-tauri`: Rust backend
- `packages/types`: shared contracts

## Frontend notes

- App Router with `src/` directory; aliases `@/*`, `@components/*`, `@features/*`, `@lib/*`.
- Default locale `fa` (RTL); `en` (LTR).
- Themes through `next-themes`: Light, Dark, System.
- shadcn/ui (New York) in `src/components/ui`. Add components with `pnpm --filter @selfplanner/desktop-frontend exec shadcn@latest add <name>`. Do not introduce other UI kits.
- Next.js moves fast. Read the relevant guide in `node_modules/next/dist/docs/` before relying on remembered APIs.

## Reusing JabeX code

JabeX is the reference implementation. When scaffolding, copy and rename rather than rewrite:

- App shell, sidebar, header, skip-to-content
- Providers: theme, locale hydrator, direction sync
- `lib/i18n/*`, `hooks/use-locale.ts`, `lib/fonts.ts`
- `components/ui/*` (shadcn), `theme-toggle`, `language-switcher`
- `globals.css` token structure
- Rust: `shared/ids.rs`, `shared/time.rs`, database open and migration wiring, `error_map`, tray module
- CI and release workflows

Change names (`jabex` → `selfplanner`), storage keys, app identifier and the primary colour hue. Do not copy JabeX-specific features (Leitner, TipTap, ink, speech).

## Dev data safety

Seed and screenshot scripts must always set `SELF_PLANNER_DATA_DIR` to a repo-local temp directory and refuse paths inside the real app-data directory.
