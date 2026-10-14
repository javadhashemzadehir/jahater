# Product

## One-line pitch

A private, offline, bilingual (Persian/English) desktop planner that makes time visible and keeps planning light, designed around ADHD time blindness.

## Problem

The author needs one place for six ways of looking at work: timeline, time tracking, timeboxing, Eisenhower matrix, to-do list and Kanban. Existing tools cover some of these, but none found so far combines them with an ADHD-first design, a local-only data model and native Persian/RTL support (see [PRODUCT_RESEARCH.md](../RESEARCH/PRODUCT_RESEARCH.md)).

## Goals

| Goal | Target |
| --- | --- |
| Capture a task from anywhere | under 5 seconds, global shortcut, title only |
| Plan a day | under 2 minutes, including overload check |
| Start focused work | 2 clicks from the timeline to a running timer |
| Privacy | all data on device, no account, no telemetry, no auto-updater in v0.x |

Targets are design goals. Measure them with the author's own use before claiming them publicly.

## Constraints

- **One task model, many views.** List, Kanban, Eisenhower matrix and timeline are views over the same rows ([ADR 007](../ADR/007-single-task-model/007-single-task-model.md)).
- **Time must be visible.** Every main screen shows elapsed and remaining time, not just stores it.
- **Bilingual and bidirectional.** `fa` (RTL, default) and `en` (LTR) share one component tree.
- **Three theme modes.** Light, Dark, System, all first-class.
- **Offline-first.** Every MVP feature works without a network.
- **Shame-free.** No broken streaks, no red failure states, no punishing copy.

## Non-goals

- Notes, wikis, documents, or a knowledge base.
- Team collaboration, assignees, comments.
- Cloud accounts or hosted sync (a later, optional, end-to-end encrypted file sync may be revisited).
- Automatic AI scheduling that overrides the user. Suggestions with confirmation are acceptable later.
- Medical claims. Self Planner is an organisation tool, not a treatment for ADHD, and the README and store text must say so.

## Primary user

The author: a self-directed learner and creator with ADHD traits, preparing for a competitive graduate economics exam while building software and publishing content. Needs: protected study blocks, quick capture, honest time estimates, low ceremony. Other users with similar needs are welcome but are not the design driver.

## Differentiators

1. ADHD-first behaviour: visible timers, overload warning, buffers, smallest-first-step.
2. Persian-native: RTL, Jalali calendar display, Saturday week start, Persian digits via font.
3. Local-first and open source, with a light Rust/Tauri footprint.
4. One data model behind all views.
5. Built in public: the build process is itself content (see [OPEN_SOURCE_AND_CONTENT.md](../OPEN_SOURCE/OPEN_SOURCE_AND_CONTENT.md)).

Differentiator 1 and 2 are the strongest. Super Productivity already covers most of the generic feature list.

## Success criteria for v0.1

- The author runs a full workday and study plan in Self Planner for two weeks without falling back to another tool.
- Estimates vs actuals report works on real data.
- Both locales and all three theme modes pass the manual checklist in [TESTING.md](../TESTING/TESTING.md).
