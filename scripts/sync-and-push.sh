#!/bin/bash
# Daily job: refresh Claude usage stats in public/data.json, commit, push.
# A push to main triggers the Netlify deploy, which is how the live site updates.
#
# Run by launchd (scripts/com.matthewmcdowall.portfolio-stats.plist) at 06:00,
# with a 12:00 retry slot. The 20h throttle below makes the retry a no-op when
# the 06:00 run already succeeded, and lets a missed morning catch up at noon.
#
# Manual:  bash scripts/sync-and-push.sh          (real run)
#          DRY_RUN=1 bash scripts/sync-and-push.sh (sync only, no commit/push)
#
# Safety: commits ONLY public/data.json (pathspec commit -- your other staged or
# unstaged work is left alone), refuses to run off `main`, and if the push is
# rejected it rebases with --autostash and retries once. Reads nothing secret.

set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$HOME/Library/Application Support/portfolio-stats"
STAMP="$STATE_DIR/last-success"
THROTTLE_SECONDS=$((20 * 3600))

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

cd "$REPO"
mkdir -p "$STATE_DIR"

if [[ -z "${DRY_RUN:-}" && -f "$STAMP" ]]; then
  age=$(( $(date +%s) - $(stat -f %m "$STAMP") ))
  if (( age < THROTTLE_SECONDS )); then
    log "last success ${age}s ago (< ${THROTTLE_SECONDS}s); skipping"
    exit 0
  fi
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  log "on branch '$branch', not main; skipping"
  exit 0
fi

python3 scripts/sync-claude-stats.py

if git diff --quiet -- public/data.json; then
  log "public/data.json unchanged; nothing to push"
  [[ -n "${DRY_RUN:-}" ]] || touch "$STAMP"
  exit 0
fi

if [[ -n "${DRY_RUN:-}" ]]; then
  log "DRY_RUN set; would commit + push public/data.json:"
  git --no-pager diff --stat -- public/data.json
  exit 0
fi

git commit -q -m "chore: sync claude stats [automated]" -- public/data.json
log "committed $(git rev-parse --short HEAD)"

if ! git push -q origin main; then
  log "push rejected; rebasing onto origin/main and retrying"
  git pull -q --rebase --autostash origin main || { git rebase --abort; log "rebase failed; leaving commit local"; exit 1; }
  git push -q origin main
fi

touch "$STAMP"
log "pushed; Netlify will redeploy"
