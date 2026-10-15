# Git workflow

Two long-lived branches, nothing else. A solo maintainer does not need topic branches, and fewer branches means no drift.

## Branches

| Branch | Purpose |
| --- | --- |
| `develop` | All work. Commits and pushes land here |
| `main` | Released code only, tagged `vX.Y.Z`. Changed only by a pull request from `develop` |

No `feature/`, `bugfix/`, `release/` or `hotfix/` branches unless the maintainer asks for one; delete it as soon as it is merged. No direct commits to `main`. Agent rules are in [AGENT_GIT_GUIDE.md](../AGENT_GIT_GUIDE/AGENT_GIT_GUIDE.md).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`. Scope is optional (`feat(timer): ...`).

Keep commits focused. One logical change per commit.

## Commit attribution policy

Commit history contains only human contributors.

- No AI assistant attribution trailers or assistant identities in commit metadata.
- Legitimate human `Co-authored-by` trailers stay.
- A tracked `commit-msg` hook in `scripts/git/` strips assistant trailers. Install it once per clone with `sh scripts/git/install-hooks.sh`. Agent rules for commits, merges and tree cleanup are in [AGENT_GIT_GUIDE.md](../AGENT_GIT_GUIDE/AGENT_GIT_GUIDE.md).

This is the default for this repo. Remove this section if the policy is not wanted for Self Planner.

## Pull requests

- Open `develop` → `main` when a sprint item is done.
- Conventional Commit title.
- CI green: frontend, Rust, release-csp.
- Describe what changed and how it was checked, including locale and theme checks for UI work.
- The maintainer merges with a merge commit and keeps `develop`.

## Releases

1. On `develop`, bump versions (`package.json` files, `Cargo.toml`, `tauri.conf.json`) and update `CHANGELOG.md` (Keep a Changelog).
2. Merge `develop` into `main` by pull request and tag `vX.Y.Z` on `main`; the release workflow builds installers.
3. Fast-forward `develop` to `main` if the merge commit differs.

Unsigned installers trigger OS warnings (for example Windows SmartScreen). State this in release notes until code signing is set up.
