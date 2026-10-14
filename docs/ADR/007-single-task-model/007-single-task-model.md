# ADR 007: One task model, many views

## Status

Accepted

## Context

The planned methods are timeline, time tracking, timeboxing, Eisenhower matrix, to-do list and Kanban. Most apps treat these as separate features with separate data, which forces duplicate entry and loses consistency.

## Decision

All views read the same `tasks` rows and related tables:

| View | Mapping |
| --- | --- |
| List | `status` filter and `sort_order` |
| Kanban | columns are `status` |
| Eisenhower matrix | quadrant is (`is_urgent`, `is_important`) |
| Timeline | `time_blocks` reference tasks |
| Tracking and timeboxing | `time_entries` reference tasks |

A drag in any view changes the underlying fields. Views never keep their own copy of the order or the status. After each change, the backend emits `tasks://changed` and open views refetch.

## Consequences

### Positive

- No duplicate data entry; the views cannot disagree.
- New views are cheap to add.
- Reports work across all methods.

### Negative

- Some view-specific ideas (separate ordering per column, per-quadrant sorting) need extra fields or conventions.
- Choosing which field a drag changes needs care, for example, moving to Done sets `completed_at`.

## Alternatives considered

- **Separate boards per method:** easier to start, inconsistent in practice.
- **Tag-based quadrants:** flexible but weaker for queries and for drag semantics.
