# ADR 001: Next.js + Tauri stack

## Status

Accepted

## Context

Self Planner needs a desktop-first, offline planner with a modern web UI, Persian RTL support and strong privacy. The author already ships JabeX on Next.js and Tauri, so patterns, components and CI can be reused.

## Decision

Use **Next.js (App Router, TypeScript, static export)** for the UI and **Tauri 2 (Rust)** as the desktop runtime and local backend.

- Development: Tauri loads the Next dev server on `localhost:3000`.
- Production: the static export in `frontend/out` is served by Tauri.
- Persistence, timers, notifications and OS integration live in Rust.

## Consequences

### Positive

- Small binaries and a stronger security posture than Electron.
- Reuse of JabeX shell, providers, i18n, theming and workflows.
- Clear IPC boundary.

### Negative

- Requires the Rust toolchain.
- Next must stay static-export compatible; no server-only features.
- Next.js changes quickly; consult the bundled docs for the installed version.

## Alternatives considered

- **Electron + React:** heavier and larger attack surface.
- **Tauri + Vite React:** viable and simpler, but gives up code reuse with JabeX.
- **Native UI:** slower iteration for a bilingual design system.
