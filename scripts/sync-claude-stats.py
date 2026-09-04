#!/usr/bin/env python3
"""Sync Claude Code usage stats into public/data.json.

Sources (all local to this Mac, read-only):
  ~/.claude/stats-cache.json     what `/usage` shows: per-day messages / sessions /
                                 tool calls, and per-day tokens (dailyModelTokens)
  ~/.claude/history.jsonl        prompt history; long-range message-count baseline
  ~/.claude/projects/**/*.jsonl  session transcripts; per-day tokens for days the
                                 cache hasn't computed yet

Both the cache and the transcripts are rolling windows (Claude Code prunes
transcripts after ~30 days), so public/data.json is the durable record: each run
merges new days in (field-wise max) and never drops a day. Only aggregate counts
are written -- no prompts, paths, or content.

Usage: pnpm sync-stats  (writes only if something changed; exit code 0 either way)
"""

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

CLAUDE_DIR = Path.home() / ".claude"
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "public" / "data.json"
FIELDS = ("messageCount", "sessionCount", "toolCallCount", "tokenCount")
TOKEN_KEYS = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return default


def bump(days, date, field, value):
    if date and value:
        days[date][field] = max(days[date][field], value)


def from_stats_cache(days):
    cache = load_json(CLAUDE_DIR / "stats-cache.json", {})
    for e in cache.get("dailyActivity", []):
        for k in ("messageCount", "sessionCount", "toolCallCount"):
            bump(days, e.get("date"), k, e.get(k, 0))
    for e in cache.get("dailyModelTokens", []):
        bump(days, e.get("date"), "tokenCount", sum(e.get("tokensByModel", {}).values()))


def from_history(days):
    path = CLAUDE_DIR / "history.jsonl"
    if not path.exists():
        return
    counts = Counter()
    with open(path) as f:
        for line in f:
            try:
                ts = json.loads(line).get("timestamp", 0)
            except (json.JSONDecodeError, AttributeError):
                continue
            if ts:
                counts[datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d")] += 1
    for date, n in counts.items():
        bump(days, date, "messageCount", n)


def from_transcripts(days):
    tokens = Counter()
    for path in (CLAUDE_DIR / "projects").rglob("*.jsonl"):
        try:
            with open(path) as f:
                for line in f:
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if obj.get("type") != "assistant":
                        continue
                    date = (obj.get("timestamp") or "")[:10]
                    usage = obj.get("message", {}).get("usage", {})
                    tokens[date] += sum(usage.get(k, 0) for k in TOKEN_KEYS)
        except OSError:
            continue
    for date, n in tokens.items():
        bump(days, date, "tokenCount", n)


def main():
    data = load_json(DATA_FILE, {})
    old = data.get("claude") or {}

    days = defaultdict(lambda: dict.fromkeys(FIELDS, 0))
    for e in old.get("dailyActivity", []):
        for k in FIELDS:
            bump(days, e.get("date"), k, e.get(k) or 0)

    from_stats_cache(days)
    from_history(days)
    from_transcripts(days)

    daily = [{"date": d, **days[d]} for d in sorted(days)]
    claude = {
        "totalMessages": sum(d["messageCount"] for d in daily),
        "totalTokens": sum(d["tokenCount"] for d in daily),
        "activeDays": sum(1 for d in daily if d["messageCount"] or d["tokenCount"]),
        "dailyActivity": daily,
    }

    if claude == old:
        print("Claude stats unchanged; nothing written.")
        return

    data["claude"] = claude
    data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"Wrote {DATA_FILE.relative_to(REPO_ROOT)}")
    print(f"  Total messages: {claude['totalMessages']:,}")
    print(f"  Total tokens:   {claude['totalTokens']:,}")
    print(f"  Active days:    {claude['activeDays']}")
    if daily:
        print(f"  Date range:     {daily[0]['date']} to {daily[-1]['date']}")


if __name__ == "__main__":
    main()
