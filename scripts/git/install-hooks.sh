#!/bin/sh
# One-time setup per clone: use the tracked hooks in scripts/git.
set -e
root=$(git rev-parse --show-toplevel)
cd "$root"
chmod +x scripts/git/commit-msg scripts/git/checkpoint.sh scripts/git/tree.sh scripts/git/install-hooks.sh
mkdir -p .git/hooks
cp scripts/git/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo "Installed commit-msg hook."
