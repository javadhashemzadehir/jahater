# ADR 005: Clean architecture for the backend

## Status

Accepted

## Context

The timer engine, planning rules and reports are the core of the product. They should be testable without Tauri or SQLite, and storage or scheduling rules should be able to change later.

## Decision

Organise Rust code as:

| Layer | Responsibility |
| --- | --- |
| `domain` | Entities, errors, timer state machine, repository ports, `Clock` trait |
| `application` | Use cases and services |
| `infrastructure` | SQLite, filesystem, repository adapters, autostart |
| `commands` | Tauri IPC: validate, call service, map result |
| `desktop` | Tray, window, notifications, global shortcuts |
| `shared` | UUIDv7, time helpers |

Dependency rule: inward only. `domain` imports neither `rusqlite` nor Tauri.

## Consequences

### Positive

- Timer and planning logic are tested with a fake clock.
- Storage can change behind ports.
- Same shape as the author's earlier apps.

### Negative

- More files than a flat CRUD layout.
- Commands must stay thin; this takes discipline.

## Alternatives considered

- Transaction-script modules per feature: faster at first, harder to test.
- Many crates: too heavy for this stage.
