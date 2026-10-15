# Agent git guide

How coding agents commit, merge and keep the git tree clean in Self Planner. It builds on [GIT_WORKFLOW.md](../GIT_WORKFLOW/GIT_WORKFLOW.md) and [AGENTS.md](../../AGENTS.md). If they disagree, AGENTS.md wins.

## Two branches only

The repository has exactly two long-lived branches and no others, local or remote:

| Branch | Purpose |
| --- | --- |
| `develop` | Where all work happens. Every checkpoint is committed and pushed here |
| `main` | Released code. Moves only by a pull request from `develop`, merged by the maintainer |

No feature, bugfix or release branches. Sprint and topic boundaries are shown by commit scopes and merge points, not by branches. Temporary branches are created only when the maintainer asks, and are deleted as soon as they are merged.

## What an agent may do on its own

| Action | Allowed without asking |
| --- | --- |
| Commit on `develop` at a checkpoint | Yes |
| Push `develop` | Yes (fast-forward only) |
| Open a PR from `develop` to `main` | Yes, when a sprint item is done |
| Merge a PR into `main` | **No**, the maintainer merges |
| Create any other branch, tag or release | **No**, only when asked |
| Delete a stale branch that is fully merged into `main` | Yes |
| Commit directly on `main` | **No** |
| Force push, rewrite published history, `reset --hard` on `main` or `develop` | **No** |
| Skip hooks (`--no-verify`) or bypass checks | **No** |

## Commit at checkpoints

A checkpoint is a point where the tree builds, the change is one logical unit and its checks pass. Commit then, not at the end of the sprint.

- Small and focused: one backend change, one view, one doc update.
- Conventional Commits with the sprint item as scope when it helps: `feat(s1-2): add list view`, `fix(trash): keep focus after restore`.
- Imperative subject, under 72 characters, no trailing period. Add a body only to say why.
- Code and its tests go in the same commit. A migration goes with the code that needs it.
- Stage by path. Do not `git add -A` blindly: build output, generated files and local data must not be committed (see `.gitignore`).
- **No AI attribution** in messages or PR text: no `Co-Authored-By: <assistant>`, no "Generated with" lines. Human `Co-authored-by` trailers are fine. The tracked hook enforces this.
- Pull before work and before push: `git pull --ff-only`. If that fails, stop and ask; do not merge or rebase `develop` on your own.

```bash
scripts/git/checkpoint.sh "feat(s1-2): add list view" apps/desktop/frontend/src/features/tasks
git push origin develop
```

The helper refuses to run on `main`, checks the message format, runs the frontend gate (`pnpm lint`, `typecheck`, `test`) and the Rust gate (`fmt`, `clippy -D warnings`, `test`) for the paths that changed, then commits.

## Promote on time

CI runs on pushes to `develop` and on pull requests. Do not let `develop` run far ahead of `main`.

1. When a sprint item meets its done-when and the Definition of Done in AGENTS.md, open a PR `develop` → `main` titled as a Conventional Commit.
2. Wait for CI (`frontend`, `rust`, `release-csp`) to be green, then tell the maintainer the PR is ready.
3. The maintainer merges with a merge commit and does **not** delete `develop`.
4. After the merge: `git fetch --prune && git switch develop && git pull --ff-only`. If `main` has a merge commit that `develop` lacks, ask before merging `main` back into `develop`.

### Ready-to-promote checklist

- [ ] CI green on `develop`
- [ ] `docs/SPRINTS/SPRINTS.md` checkboxes and, if a decision changed, an ADR updated
- [ ] New strings in both `fa` and `en`
- [ ] No generated files, local data or secrets in the diff
- [ ] No other branches exist (`scripts/git/tree.sh` shows only `main` and `develop`)

## Keep the tree tidy

Run the report at the start and end of every session:

```bash
scripts/git/tree.sh            # graph, ahead/behind, extra branches
scripts/git/tree.sh --prune    # also delete extra branches already merged into main
```

Healthy tree:

- `git branch -a` lists only `main`, `develop` and their `origin/*` counterparts.
- `develop` equals `origin/develop`.
- `main` is behind `develop` only by unreleased work.

If local and remote `develop` have diverged, stop and ask. Do not force push to fix it.

## First-time setup per clone

```bash
sh scripts/git/install-hooks.sh
```

This installs the `commit-msg` hook that strips assistant attribution trailers. Hooks live in `.git/hooks` and are not versioned, so each clone needs this once.

## When something goes wrong

| Situation | Do this |
| --- | --- |
| Committed to `main` by mistake | Do not push. Tell the maintainer; moving the commits to `develop` needs a reset, which needs approval |
| `git pull --ff-only` fails | Stop and ask. Do not merge, rebase or force push |
| CI red after pushing | Fix forward in a new commit on `develop`. Do not open a promotion PR while red |
| Wrong file committed | `git rm --cached <file>` in a new commit. If it holds a secret, stop and tell the maintainer: the secret must be rotated |
| An extra branch appears | Check it is merged into `main`, then delete it local and remote. If not merged, ask |
