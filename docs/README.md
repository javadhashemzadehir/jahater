# Self Planner documentation

Start here if you are new to the repo. Layout mirrors JabeX: one folder per document, numbered ADRs.

| Doc | When to read it |
| --- | --- |
| [PRODUCT.md](./PRODUCT/PRODUCT.md) | Vision, scope, principles, what not to build |
| [PRODUCT_RESEARCH.md](./RESEARCH/PRODUCT_RESEARCH.md) | Existing products, lessons, the gap Self Planner fills |
| [TIME_MANAGEMENT_RESEARCH.md](./RESEARCH/TIME_MANAGEMENT_RESEARCH.md) | Time-management and ADHD research, evidence levels, open verification tasks |
| [REQUIREMENTS.md](./REQUIREMENTS/REQUIREMENTS.md) | Functional and non-functional requirements with priorities |
| [ARCHITECTURE.md](./ARCHITECTURE/ARCHITECTURE.md) | Monorepo layout, layers, data flow |
| [BACKEND.md](./BACKEND/BACKEND.md) | Rust clean architecture, IPC commands, timer engine |
| [FRONTEND.md](./FRONTEND/FRONTEND.md) | Next.js structure, bilingual i18n, three-mode theming, fonts, views |
| [DATABASE.md](./DATABASE/DATABASE.md) | SQLite schema, migrations, local data layout |
| [UX_ADHD_PRINCIPLES.md](./UX/UX_ADHD_PRINCIPLES.md) | Interaction and visual design principles |
| [DEVELOPMENT.md](./DEVELOPMENT/DEVELOPMENT.md) | Setup, commands, first run |
| [TESTING.md](./TESTING/TESTING.md) | Test expectations for frontend, Rust, CI |
| [GIT_WORKFLOW.md](./GIT_WORKFLOW/GIT_WORKFLOW.md) | Branches, commits, releases |
| [AGENT_GIT_GUIDE.md](./AGENT_GIT_GUIDE/AGENT_GIT_GUIDE.md) | How agents commit, merge on time and keep the git tree clean |
| [ROADMAP.md](./ROADMAP/ROADMAP.md) | Phased delivery checklist and MVP definition |
| [SPRINTS.md](./SPRINTS/SPRINTS.md) | Roadmap phases sliced into sprints with goals and done-when |
| [OPEN_SOURCE_AND_CONTENT.md](./OPEN_SOURCE/OPEN_SOURCE_AND_CONTENT.md) | Licensing, repo hygiene, video and content plan |
| [ADR/](./ADR/) | Architecture Decision Records |

## ADR index

- [001 Next.js + Tauri stack](./ADR/001-next-tauri-stack/001-next-tauri-stack.md)
- [002 UI framework choice](./ADR/002-ui-framework-choice/002-ui-framework-choice.md)
- [003 Local-first SQLite](./ADR/003-local-first-sqlite/003-local-first-sqlite.md)
- [004 Bilingual i18n and theming](./ADR/004-bilingual-i18n-and-theming/004-bilingual-i18n-and-theming.md)
- [005 Clean architecture](./ADR/005-clean-architecture/005-clean-architecture.md)
- [006 Timer engine](./ADR/006-timer-engine/006-timer-engine.md)
- [007 Single task model](./ADR/007-single-task-model/007-single-task-model.md)
- [008 Release CSP script policy](./ADR/008-release-csp-script-policy/008-release-csp-script-policy.md)
- [009 shadcn and third-party components](./ADR/009-shadcn-and-third-party-components/009-shadcn-and-third-party-components.md)

## About sources

The research docs come from web searches run on 2026-10-14. Most sources are vendor blogs and general health media, not peer-reviewed papers. Each claim carries an evidence level, and the time-management research doc ends with a verification checklist. Do not repeat those claims as established science in public content until the checklist is done.
