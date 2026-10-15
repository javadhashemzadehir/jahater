-- V7: device settings and daily reviews (S3.2).
-- `app_meta` holds preferences as text values keyed by name (daily capacity, later more).
-- `daily_reviews.day` is the user's local date, YYYY-MM-DD, Gregorian.

CREATE TABLE app_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE daily_reviews (
  id           TEXT PRIMARY KEY,
  day          TEXT NOT NULL UNIQUE,
  morning_note TEXT,
  evening_note TEXT,
  energy_level INTEGER CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5),
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
