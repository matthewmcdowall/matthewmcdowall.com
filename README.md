# matthewmcdowall.com

Personal portfolio and blog, live at [matthewmcdowall.com](https://matthewmcdowall.com).

Next.js 16 (App Router) + React 19 + TypeScript, styled mostly by hand in `app/globals.css` rather than Tailwind utility classes. See `AGENTS.md` for a fuller map of the codebase, conventions, and known gaps.

## Getting Started

This project uses **pnpm**.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see it.

The homepage lives in `app/page.tsx`; blog posts are markdown files in `content/blog/`.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in what you need. `lib/env.ts` is the full list: `RESEND_API_KEY` and `CONTACT_TO` for the contact form, plus optional `RESEND_FROM`. Nothing else on the site needs a secret.

## Deployment

Deployed on **Netlify**, building from `main`. Security headers (CSP, frame-ancestors, referrer/permissions policies) are set in `next.config.ts`; the Netlify Next runtime applies them to every response.

## Scripts

- `pnpm dev` — dev server
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint
- `pnpm sync-stats` — refresh the Claude usage stats in `public/data.json` from local `~/.claude/` data

## Live stats

The homepage bento grid mixes two kinds of data:

- **GitHub and Hugging Face** are public, unauthenticated APIs fetched server-side at render time and cached for an hour (the page is ISR, `revalidate = 3600`). Nothing runs per visitor, so public traffic can't burn API quota. If a fetch fails the card shows the last snapshot in `public/data.json`.
- **Claude Code usage** only exists on this Mac (`~/.claude/`), so it's pushed rather than pulled: `scripts/sync-claude-stats.py` merges the local stats into `public/data.json`, and a launchd agent commits + pushes that file every morning at 06:00 (12:00 retry). The push triggers the Netlify deploy. The file is the durable record — Claude Code prunes its own logs after ~30 days, so the script only ever adds days, never drops them. Only aggregate counts are written.

Install the daily job once per machine:

```bash
cp scripts/com.matthewmcdowall.portfolio-stats.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.matthewmcdowall.portfolio-stats.plist
```

`launchctl kickstart -k gui/$(id -u)/com.matthewmcdowall.portfolio-stats` runs it immediately; `DRY_RUN=1 bash scripts/sync-and-push.sh` runs it without committing; the log is `~/Library/Logs/portfolio-stats.log`.
