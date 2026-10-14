# Testing

How Self Planner is verified without telemetry or cloud test services.

## Run locally

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Rust, from `apps/desktop/src-tauri`:

```bash
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

Desktop smoke: `pnpm tauri:dev`. Installer smoke: `pnpm tauri:build`.

## Frontend

| Area | Tooling |
| --- | --- |
| Unit and component | Vitest and Testing Library (`*.test.ts(x)` next to the code) |
| Types | `tsc --noEmit` |
| Lint | ESLint |

Prefer tests for pure helpers (date and duration formatting, quadrant mapping, capacity maths, shortcut chords) and critical flows. Avoid snapshot-heavy suites.

Required automated checks:

- Dictionary parity: `en` and `fa` have identical key sets.
- `locale-store`: `setLocale` sets `lang` and `dir`, persists, and survives a storage failure.
- Theme toggle renders three options and marks the active one with `aria-pressed`.
- Formatters return correct Jalali output for `fa` and Gregorian for `en`.

## Rust

| Layer | Prefer |
| --- | --- |
| Domain | Pure unit tests with a fake `Clock`: timer elapsed maths, pause and resume, overload calculation |
| Application | Use-case tests against temp SQLite |
| Infrastructure | Repository tests against `open_database_at(tempdir)` |

Timer-specific tests:

- Elapsed time after a simulated suspend (clock jumps forward) is correct.
- Starting a second timer stops the first.
- A crash with an open entry is detected on startup.
- The partial unique index rejects two running entries.

Domain code must stay free of Tauri and SQLite imports.

## Manual checklist (every UI change)

Run the affected screens through all six combinations:

| | Light | Dark | System |
| --- | --- | --- | --- |
| `fa` (RTL) | ☐ | ☐ | ☐ |
| `en` (LTR) | ☐ | ☐ | ☐ |

Check each:

- No clipped or overlapping text; layout mirrors correctly.
- Directional icons mirrored, clock and play icons not.
- Contrast is sufficient; no hardcoded colours.
- Switching theme or language live does not flash or reload.
- System mode follows an OS theme change while the app is open.
- Keyboard-only use works, including drag and drop alternatives.
- Reduced-motion setting removes non-essential animation.
- Persian digits appear in `fa`, Latin in `en`.

Release builds only:

- The theme bootstrap script is not blocked by the CSP (open the app with the OS in dark mode and confirm no light flash).
- Global shortcut and notifications work on Windows; Linux behaviour (including Wayland) documented.

## CI

GitHub Actions on pull requests:

- Frontend job: install with frozen lockfile, lint, typecheck, test, build.
- Rust job: fmt, clippy with warnings denied, test (Linux dependencies installed first).
- Security workflow: dependency audit (`cargo deny` or `cargo audit`, `pnpm audit`) and licence check.

Release builds run only on `v*` tags.
