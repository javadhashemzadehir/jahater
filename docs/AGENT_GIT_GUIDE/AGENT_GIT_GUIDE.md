# Agent git guide

How coding agents commit, branch, merge and keep the git tree clean in Self Planner. It builds on [GIT_WORKFLOW.md](../GIT_WORKFLOW/GIT_WORKFLOW.md) and the rules in [AGENTS.md](../../AGENTS.md). If they disagree, AGENTS.md wins.

## What an agent may do on its own

| Action | Allowed without asking |
| --- | --- |
| Create `feature/*` or `bugfix/*` branches from `develop` | Yes |
| Commit on a feature or bugfix branch | Yes, at every checkpoint (below) |
| Push a feature or bugfix branch | Yes |
| Open a PR into `develop` | Yes |
| Merge a PR into `develop` | Yes, once CI is green and the merge checklist passes |
| Delete a branch that is merged into `develop` | Yes |
| Commit directly to `main` or `develop` | **No** |
| Merge into `main`, tag, cut a release | **No**, only when the user asks |
| Force push, rewrite published history, `reset --hard` on shared branches | **No** |
| Skip hooks (`--no-verify`) or bypass checks | **No** |

Anything that publishes outside the repo (releases, tags, issue comments) needs the user's say-so.

## One sprint, one branch

- One branch per sprint item or small group of items: `feature/s1-2-list-view`, `feature/s1-3-kanban`.
- Branch from the latest `develop`, never from another feature branch. Stacking is allowed only when the base branch is already in an open PR, and only one level deep. Say so in the PR.
- Names: lowercase kebab-case. `bugfix/` for non-urgent fixes, `hotfix/` only from `main`.

```bash
git fetch --prune
git switch develop && git pull --ff-only
git switch -c feature/s1-2-list-view
```

## Commit at checkpoints

A checkpoint is a point where the tree builds, the change is one logical unit and its checks pass. Commit then, not at the end of the sprint.

- Small and focused: one backend change, one view, one doc update.
- Conventional Commits: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, with an optional scope: `feat(trash): add hold-to-confirm purge`.
- Imperative subject, under 72 characters, no trailing period. Add a body only to say why.
- Code and its tests go in the same commit. A migration goes with the code that needs it.
- Stage by path. Do not `git add -A` blindly: generated files such as `next-env.d.ts`, build output and local data must not be committed.
- **No AI attribution** in messages or PR text: no `Co-Authored-By: Claude`, no "Generated with" lines. Human `Co-authored-by` trailers are fine. The tracked hook enforces this even if a tool adds one.

Use the helper to gate and commit in one step:

```bash
scripts/git/checkpoint.sh "feat(tasks): add list view" apps/desktop/frontend/src/features/tasks
```

It refuses to run on `main` or `develop`, checks the message format, runs the frontend gate (`pnpm lint`, `typecheck`, `test`) and the Rust gate (`fmt`, `clippy -D warnings`, `test`) for the paths that changed, then commits.

## Merge on time

Long-lived branches cause the drift that this repo already hit once (local `develop` ahead of `origin/develop`, a sprint stacked on an unmerged one). Rules:

1. Open the PR as soon as the first checkpoint is pushed, as a draft if work continues. CI only runs on PRs and on `main` and `develop`, so a branch with no PR is never tested.
2. Merge when the sprint item meets its done-when and the Definition of Done in AGENTS.md. Do not wait for the whole phase.
3. A branch should live no longer than one sprint. If one is older, rebase or merge `develop` into it before continuing, and say why in the PR.
4. Merge in order. If PR B is stacked on PR A, merge A first, then retarget B to `develop`.
5. Merge into `develop` with a merge commit (`gh pr merge --merge`), so each sprint stays visible in the graph. Do not squash a multi-commit sprint.
6. Delete the branch right after merging (`--delete-branch`), local and remote.
7. `main` moves only through a `release/vX.Y.Z` branch, never by an agent on its own.

### Merge checklist

- [ ] CI green: `frontend`, `rust`, `release-csp`
- [ ] PR targets `develop`, title is a Conventional Commit
- [ ] `docs/SPRINTS/SPRINTS.md` checkboxes and, if a decision changed, an ADR updated
- [ ] New strings in both `fa` and `en`
- [ ] No generated files or secrets in the diff
- [ ] Not stacked on an unmerged branch (or that branch merged first)

```bash
gh pr checks <number> --watch
gh pr merge <number> --merge --delete-branch
git switch develop && git pull --ff-only
```

## Keep the tree tidy

Run the report at the start and end of every session:

```bash
scripts/git/tree.sh            # graph, ahead/behind, merged and stale branches
scripts/git/tree.sh --prune    # also delete branches already merged into develop
```

Healthy tree:

- `develop` equals `origin/develop`; `main` is only behind `develop` by unreleased work.
- No merged branches linger locally or on the remote.
- Every open branch has an open PR and a recent commit.
- `git log --graph --oneline --all` shows short side branches that return to `develop`, not parallel stacks.

If local and remote `develop` have diverged, stop and ask. Do not force push to fix it.

## First-time setup per clone

```bash
sh scripts/git/install-hooks.sh
```

This installs the `commit-msg` hook that strips assistant attribution trailers. Hooks live in `.git/hooks` and are not versioned, so each clone needs this once.

## When something goes wrong

| Situation | Do this |
| --- | --- |
| Committed to `develop` by mistake | Do not push. `git branch feature/<name>` to keep the commits, then ask before resetting `develop` |
| Merge conflict | Merge `develop` into the branch, resolve, run the gate, commit as `chore: merge develop into <branch>` |
| CI red after pushing | Fix forward in a new commit on the branch. Do not merge red |
| Wrong file committed | `git rm --cached <file>` in a new commit. If it holds a secret, stop and tell the user: the secret must be rotated |
| Unsure whether to merge | Leave the PR open and say what is blocking it |
