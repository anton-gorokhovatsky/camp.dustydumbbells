#!/usr/bin/env bash
set -euo pipefail

if [ "${GITHUB_ACTIONS:-}" != true ] || [ "${GITHUB_EVENT_NAME:-}" != schedule ]; then
  printf '%s\n' 'Currency history runs only in the scheduled Actions checkout.' >&2
  exit 1
fi

# Run only in the disposable scheduled-job checkout, after snapshot validation.
# Data history lives separately; this script never pushes the main branch.
currency_snapshot_file="${1:?Pass the validated snapshot outside the checkout}"
currency_archive_branch='codex/cbr-data'
test -f "$currency_snapshot_file"

if git ls-remote --exit-code --heads origin "refs/heads/$currency_archive_branch" >/dev/null; then
  git fetch --depth=1 origin "refs/heads/$currency_archive_branch"
  git checkout --detach FETCH_HEAD
else
  currency_remote_result=$?
  if [ "$currency_remote_result" -ne 2 ]; then
    exit "$currency_remote_result"
  fi
  git checkout --orphan "$currency_archive_branch"
  git rm -rf --ignore-unmatch .
fi

cp "$currency_snapshot_file" currency.json
git add -- currency.json
if git diff --cached --quiet; then
  exit 0
fi
git -c user.name='github-actions[bot]' \
    -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
    commit -m 'data: record official CBR currency snapshot'
git push origin "HEAD:refs/heads/$currency_archive_branch"
