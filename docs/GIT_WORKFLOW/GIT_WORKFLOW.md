# Git workflow

Same model as JabeX: a light Git Flow suitable for a solo maintainer now and contributors later.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Released code only, tagged `vX.Y.Z` |
| `develop` | Integration branch for the next release |
| `feature/<name>` | New functionality |
| `bugfix/<name>` | Non-urgent fixes against `develop` |
| `release/vX.Y.Z` | Release hardening, version bumps, changelog |
| `hotfix/<name>` | Emergency fixes from `main` |

Rules: lowercase kebab-case, short descriptive names (`feature/eisenhower-matrix`, `feature/timer-engine`, `bugfix/timer-after-sleep`). No direct commits to `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`. Scope is optional (`feat(timer): ...`).

Keep commits focused. One logical change per commit.

## Commit attribution policy

Mirrors JabeX: commit history contains only human contributors.

- No AI assistant attribution trailers or assistant identities in commit metadata.
- Legitimate human `Co-authored-by` trailers stay.
- JabeX enforces this with a `commit-msg` hook that strips assistant trailers. Copy `scripts/git/commit-msg` from JabeX into `.git/hooks/commit-msg` when the repo is created.

This is carried over from JabeX as a default. Remove this section if the policy is not wanted for Self Planner.

## Pull requests

- Target `develop`.
- Conventional Commit title.
- CI green: frontend, Rust.
- Describe what changed and how it was checked, including locale and theme checks for UI work.

## Releases

1. Branch `release/vX.Y.Z` from `develop`.
2. Bump versions (`package.json` files, `Cargo.toml`, `tauri.conf.json`) and update `CHANGELOG.md` (Keep a Changelog).
3. Merge to `main`, tag `vX.Y.Z`; the release workflow builds installers.
4. Merge back to `develop`.

Unsigned installers trigger OS warnings (for example Windows SmartScreen). State this in release notes until code signing is set up.
