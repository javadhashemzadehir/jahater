# ADR 003: Local-first storage with SQLite

## Status

Accepted

## Context

Planner data is personal. Reports need time-range queries. The app must work offline and survive crashes.

## Decision

- Store everything in a local SQLite file (WAL mode, foreign keys on).
- Use `rusqlite` (bundled) and `refinery` migrations. No ORM.
- UUIDv7 ids, UTC ISO 8601 timestamps, soft delete via `deleted_at`, `revision` per row.
- Back up automatically and export to normalised JSON.
- No network access in v0.x.

## Consequences

### Positive

- SQL handles reports and ordering simply.
- Transactions protect timers and drag operations.
- `revision` and UUIDs leave a path to future sync without committing to one.

### Negative

- Schema changes need migrations and care.
- Hand-written SQL needs tests.

## Alternatives considered

- **JSON file:** weak for queries and concurrent writes.
- **`sqlx`:** compile-time checks are attractive, but `rusqlite` + `refinery` is proven in the author's earlier work and avoids an async DB layer.
- **IndexedDB in the webview:** ties data to the webview and is awkward to back up.
