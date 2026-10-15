-- V6: heartbeat for orphan-timer recovery (S2.4). While a timer runs, the app refreshes
-- `last_seen_at` every few seconds without bumping `revision`. If the app is closed or
-- crashes, the next start knows the last moment the timer was certainly alive.

ALTER TABLE time_entries ADD COLUMN last_seen_at TEXT;
