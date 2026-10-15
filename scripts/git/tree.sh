#!/bin/sh
# Git tree report and safe cleanup.
#   scripts/git/tree.sh           report only
#   scripts/git/tree.sh --prune   delete extra local and remote branches already merged into main
set -e
git fetch --prune --quiet

echo "== Graph =="
git log --graph --oneline --decorate --all -n 25

echo
echo "== Local vs remote =="
for b in main develop; do
  if git show-ref --verify --quiet "refs/heads/$b" && git show-ref --verify --quiet "refs/remotes/origin/$b"; then
    echo "$b: $(git rev-list --left-right --count "origin/$b...$b" | awk '{print "behind "$1", ahead "$2}')"
  fi
done

echo
echo "== Extra branches merged into origin/main (safe to delete) =="
merged=$(git branch -r --merged origin/main | sed 's# *origin/##' | grep -vE '^(HEAD|main|develop)( |$)|->' || true)
[ -n "$merged" ] && echo "$merged" || echo "(none)"

echo
echo "== Not merged, with age =="
for b in $(git branch -r --no-merged origin/main | sed 's# *origin/##' | grep -vE '^(HEAD|main|develop)$|->'); do
  echo "$b  last commit: $(git log -1 --format=%cr "origin/$b")"
done

if [ "$1" = "--prune" ]; then
  echo
  for b in $merged; do
    git push origin --delete "$b" && echo "deleted origin/$b"
    git show-ref --verify --quiet "refs/heads/$b" && git branch -d "$b"
  done
fi
