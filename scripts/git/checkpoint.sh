#!/bin/sh
# Checkpoint = run the gate for what changed, then commit.
# Usage: scripts/git/checkpoint.sh "feat(tasks): add list view" [path ...]
# With no paths it stages tracked changes only (never untracked files by surprise).
set -e
msg=$1
[ -n "$msg" ] || { echo "usage: checkpoint.sh \"<conventional message>\" [path ...]" >&2; exit 2; }
shift

case "$(git rev-parse --abbrev-ref HEAD)" in
  main|develop) echo "Refusing to commit on $(git rev-parse --abbrev-ref HEAD). Branch from develop first." >&2; exit 1 ;;
esac

echo "$msg" | grep -qE '^(feat|fix|docs|refactor|test|chore|ci|perf|build)(\([a-z0-9-]+\))?!?: .+' \
  || { echo "Message must be a Conventional Commit." >&2; exit 1; }

if [ "$#" -gt 0 ]; then git add -- "$@"; else git add -u; fi

changed=$(git diff --cached --name-only)
[ -n "$changed" ] || { echo "Nothing staged."; exit 0; }

if echo "$changed" | grep -q '^apps/desktop/frontend/\|^packages/'; then
  pnpm lint && pnpm typecheck && pnpm test
fi
if echo "$changed" | grep -q '^apps/desktop/src-tauri/'; then
  (cd apps/desktop/src-tauri && cargo fmt --all -- --check && cargo clippy --all-targets --all-features -- -D warnings && cargo test)
fi

git commit -m "$msg"
