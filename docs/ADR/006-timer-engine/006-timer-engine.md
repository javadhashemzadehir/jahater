# ADR 006: Timer engine in Rust with absolute timestamps

## Status

Accepted

## Context

Time perception is the central problem Self Planner addresses. A timer that drifts, pauses with a hidden window or loses time after sleep would destroy trust. Webview timers throttle in the background.

## Decision

- The backend owns timers. The frontend only displays.
- A running entry stores `started_at`, `paused_total_sec` and optionally `paused_at` and `target_min`. Elapsed = `now - started_at - paused_total_sec` (minus the open pause, if any).
- Rust emits `timer://tick` for display only; displayed values are computed from timestamps, so missed ticks change nothing.
- A partial unique index (`is_running = 1`) allows only one running entry.
- Start, pause, resume and stop are persisted immediately in transactions.
- On startup, an unfinished entry triggers a recovery prompt: resume, stop at last known time, or discard.
- Timebox end and block start notifications are sent from Rust.
- Pomodoro, Flowtime, timebox and tracker are modes of one entry type.
- `domain` takes a `Clock` trait so tests can simulate sleep and crashes.

## Consequences

### Positive

- Correct across suspend, hidden windows and crashes.
- One simple data model for all four modes.
- Testable without waiting in real time.

### Negative

- Events and IPC add a little complexity versus a JS `setInterval`.
- Recovery UI needs design for the orphaned-timer case.
- A user changing the system clock can distort elapsed time; document and consider a monotonic fallback for the in-session display.

## Alternatives considered

- **Frontend timer with periodic saves:** loses time when the webview is throttled or the app crashes.
- **Separate tables per mode:** duplicated logic.
