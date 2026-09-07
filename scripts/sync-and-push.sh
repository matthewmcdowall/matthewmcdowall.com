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
# unstaged work is left alone), refuses to run off `main`, rebases with
# --autostash if origin moved, and pushes whenever local is ahead -- so a commit
# made while offline (the Mac often wakes before Wi-Fi is up) goes out on the
# next run instead of piling up. Reads nothing secret.

set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$HOME/Library/Application Support/portfolio-stats"
STAMP="$STATE_DIR/last-success"
THROTTLE_SECONDS=$((20 * 3600))
NET_TRIES=10          # x NET_WAIT seconds to wait for the network after wake
NET_WAIT=30

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

if ! git diff --quiet -- public/data.json; then
  if [[ -n "${DRY_RUN:-}" ]]; then
    log "DRY_RUN set; would commit public/data.json:"
    git --no-pager diff --stat -- public/data.json
  else
    git commit -q -m "chore: sync claude stats [automated]" -- public/data.json
    log "committed $(git rev-parse --short HEAD)"
  fi
fi

# Wait for the network: this fires on wake, and DNS is often not up yet.
online=0
for (( i = 1; i <= NET_TRIES; i++ )); do
  if git fetch -q origin main 2>/dev/null; then online=1; break; fi
  (( i < NET_TRIES )) && sleep "$NET_WAIT"
done
if (( ! online )); then
  log "no network after $(( NET_TRIES * NET_WAIT ))s; leaving $(git rev-list --count origin/main..main) commit(s) local for the next run"
  exit 1
fi

behind=$(git rev-list --count main..origin/main)
ahead=$(git rev-list --count origin/main..main)

if [[ -n "${DRY_RUN:-}" ]]; then
  log "DRY_RUN set; ahead ${ahead}, behind ${behind}; not pushing"
  exit 0
fi

if (( behind > 0 )); then
  log "origin/main moved (${behind} new); rebasing"
  git pull -q --rebase --autostash origin main || { git rebase --abort 2>/dev/null || true; log "rebase failed; leaving commits local"; exit 1; }
  ahead=$(git rev-list --count origin/main..main)
fi

if (( ahead > 0 )); then
  git push -q origin main
  log "pushed ${ahead} commit(s); Netlify will redeploy"
else
  log "nothing to push"
fi

touch "$STAMP"
