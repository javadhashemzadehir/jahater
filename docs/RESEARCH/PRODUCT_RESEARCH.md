# Product research

Collected 2026-10-14 via web search. Purpose: know what exists, what to learn from it, and where the real gap is.

## Reading the evidence

Comparison articles for commercial apps are mostly written by the vendors or by affiliate sites, so they lean favourable. Prices and plans change often. Re-check any detail before using it in public content. Where a claim comes from a single source, it is marked.

## 1. Open-source tools

### Super Productivity (closest competitor)

- Open source, MIT, works fully offline, no account required.
- Drag-and-drop daily planner, weekly schedule, Kanban boards.
- Pomodoro, timeboxing and Flowtime modes with one-click time tracking and reports.
- Views: Kanban, Eisenhower matrix, compact list, custom.
- Integrations: Jira, GitHub, GitLab, Gitea, Redmine, OpenProject, Google Calendar.
- Optional sync via Nextcloud, WebDAV, Dropbox or its own sync service.
- Rule-based automations, plugin system, a procrastination helper based on CBT techniques, and a structured end-of-day review.
- Platforms: Windows, macOS, Linux, Android, iOS.

**Implication:** the generic feature list (timeline, tracking, timeboxing, matrix, list, Kanban) already exists here. "No tool does this" is not a valid reason to build Self Planner. The reasons have to be ADHD-first design, native Persian/RTL and a lighter local-first stack.

### Others

| Tool | Relevance |
| --- | --- |
| ActivityWatch | Open-source automated time tracker, privacy-focused. Its server is in Rust (`aw-server-rust`) and there is a Tauri distribution in progress (`aw-tauri`). Reference for a future automatic-tracking phase. |
| Vikunja, Planka, Kaneo | Open-source task and Kanban tools. Reference for data model and Kanban UX. |
| Lunatask | Encrypted to-do, habits, journal. Offers Kanban, Eisenhower and other techniques. Closed source; useful as a UX reference. |
| FocusBoard | Chrome extension combining an Eisenhower matrix as a Kanban board with a Pomodoro timer. Shows that this combination is easy to start but needs strong execution to matter. |
| solidtime, Cattr | Open-source time trackers aimed at teams and billing, not personal planning. |

## 2. Commercial ADHD-oriented tools

| Tool | Positioning in sources | Note |
| --- | --- | --- |
| Tiimo | Visual, icon-based daily planner for neurodivergent users, with countdown visuals | Best UX reference for time blindness. Free tier plus paid Pro. |
| Sunsama | Guided daily planning ritual, warns when you overcommit | Calendar-first and cloud-based. Paid, no free plan reported. |
| Motion | Auto-schedules tasks into the calendar | Removes decisions, also removes control. Expensive. |
| Structured | Timeline-based daily planner | Apple platforms. |
| Llama Life | Timeboxing for single-task focus sessions | |
| Akiflow | Fast capture from many sources into one timeline | |
| Reclaim | Automatic time blocking to protect focus time | |
| Amazing Marvin | Highly customisable, positioned for ADHD | |

## 3. What to learn

- **Tiimo:** make time concrete. Countdown visuals and icons are core, not decoration.
- **Sunsama:** a short daily ritual plus an overload warning prevents overcommitting.
- **Motion:** removing decisions helps people who freeze at "what now?", but taking control away backfires. Prefer suggestion with confirmation.
- **Super Productivity:** automation, plugins and a procrastination helper can coexist with a simple default.
- **ActivityWatch:** automatic tracking can be local and privacy-preserving.

## 4. The gap

| Gap | Confidence |
| --- | --- |
| Persian UI with RTL and Jalali calendar in a planner with these features | Medium. No evidence found in tools reviewed; verify by testing the tools directly before claiming it. |
| ADHD-first design that is also open source and offline | Medium. The ADHD-specific tools reviewed are commercial and mostly cloud-based; the open-source ones are general-purpose. |
| Lightweight desktop footprint (Tauri/Rust) | Not measured. Compare memory and startup against Super Productivity before claiming it. |

## 5. Risks

| Risk | Response |
| --- | --- |
| Overlap with Super Productivity | Focus on ADHD-first behaviour and Persian. Consider contributing or building as a plugin if the gap proves small. |
| Small Persian-speaking audience | The primary user is the author, so the cost of a small audience is low. |
| Scope creep | MVP boundary in [ROADMAP.md](../ROADMAP/ROADMAP.md). |

## Sources

- [FocusBoard](https://github.com/prateek5525/focusboard)
- [Kaneo alternatives, OpenAlternative](https://openalternative.co/alternatives/kaneo)
- [Wekan alternatives, OpenAlternative](https://openalternative.co/alternatives/wekan)
- [Microsoft Planner alternatives, AlternativeTo](https://alternativeto.net/software/microsoft-planner/?origin=eu)
- [ActivityWatch organisation on GitHub](https://github.com/ActivityWatch)
- [Super Productivity on Flathub](https://flathub.org/ja/apps/com.super_productivity.SuperProductivity)
- [Best ADHD apps 2026, Morgen](https://www.morgen.so/blog-posts/adhd-productivity-apps)
- [Best ADHD daily planner apps 2026, Lifestack](https://lifestack.ai/blog/adhd-daily-planner)
- [Best calendar for ADHD, Fabric](https://fabric.so/comparison/best-calendar-for-adhd)
- [Best ADHD planners, Saner.AI](https://saner.ai/blogs/best-adhd-planners)
- [Best ADHD task management apps 2026, Super Productivity blog](https://super-productivity.com/blog/best-adhd-task-management-apps-2026/)
