# Open source and content plan

## Licence

Default: **MIT**, consistent with JabeX. Confirm before the first public release.

| Licence | Effect | Fit |
| --- | --- | --- |
| MIT | Anyone may reuse, including in closed products | Maximum adoption; matches JabeX and Super Productivity |
| Apache-2.0 | Like MIT with an explicit patent grant | If patents are a concern |
| GPL / AGPL | Derivatives must stay open | If closed forks are unwanted |

This is general information, not legal advice. For a dual-licensing or paid-sync plan, get proper legal review first.

Dependency hygiene: check dependency licences (`cargo deny`, a JS licence checker) in CI. Check redistribution rights of every bundled font (see [FRONTEND.md](../FRONTEND/FRONTEND.md#fonts)).

## Repository files

- `README.md` (English, with a short Persian section later)
- `LICENSE`
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`
- `AGENTS.md` for coding agents
- `.github/`: issue and PR templates, `CODEOWNERS`, labels, `dependabot.yml`, CI, release, security and stale workflows
- Labels: `good first issue`, `help wanted`, `area:frontend`, `area:rust`, `area:i18n`, `area:docs`

## Release principles

- Public roadmap and ADRs.
- Small, frequent releases with notes.
- Privacy statement in the README: no accounts, no telemetry, no cloud, no auto-updater.
- Honest about limits: tested platforms, unsigned installers, known gaps.
- Credit the projects learned from, respecting their licences.
- Not a medical product. The README says Self Planner is an organisation tool and not a treatment for ADHD.

## Content plan

The build is the content. Record real work, not staged demos.

### Video series ideas

1. Why I am building my own planner: the problem, the review of existing tools, the decision.
2. What the research says about time management and ADHD, with evidence levels stated honestly.
3. Scaffolding a Tauri + Next.js app and reusing patterns from an earlier project.
4. One data model, four views: list, Kanban, matrix, timeline.
5. Building a timer that survives sleep and crashes.
6. Bilingual RTL/LTR and Light/Dark/System done properly.
7. A week living in Self Planner: estimates vs actuals.
8. Releasing v0.1.

### Formats

- Long videos on YouTube for process and teaching.
- Short clips (YouTube Shorts, Instagram, Telegram): one tip or one demo each.
- Release notes and repo posts for each version.

### Production notes

- Screen-record real sessions. Plan recording and editing blocks in Self Planner and track the real time; that data is good material for the estimates episode.
- Cite sources in descriptions. Do not present unverified research as settled science (see the verification checklist in [TIME_MANAGEMENT_RESEARCH.md](../RESEARCH/TIME_MANAGEMENT_RESEARCH.md)).
- Keep developer-tooling videos separate from the economics channel (separate playlist or channel) so the economics channel keeps its focus. This is a branding decision for the author.

## Fit with the rest of the plan

- The exam study block is a fixed pillar; no side project may take it.
- The CMS starter kit and personal site come after the current build phase, not in parallel.
