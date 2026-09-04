<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# matthewmcdowall.com

Personal portfolio + blog. Next.js 16 App Router, React 19, TypeScript, Tailwind v4. Package manager is **pnpm** (there's a `pnpm-workspace.yaml`, but this is a single-package repo — no other workspace members exist). Deployed on **Netlify**, not Vercel — ignore the README's Vercel deploy instructions, they're unedited `create-next-app` boilerplate.

## Commands
- `pnpm dev` — dev server
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm lint` — ESLint
- No test suite exists.

## Structure
- `app/page.tsx` — the entire homepage in one file (terminal boot animation → nav → hero → about/bento-stats → skills marquee → projects → experience → education → contact). Content is hardcoded JSX, not CMS-driven.
- `app/blog/`, `content/blog/*.md` — blog index + `[slug]` pages, posts are markdown with frontmatter, rendered via `next-mdx-remote/rsc`. `lib/content.ts` reads them (`draft: true` in frontmatter excludes a post).
- `app/contact/page.tsx`, `app/api/contact/route.ts`, `components/ContactForm.tsx` — contact form flow, the site's only dynamic write surface. The route checks `Origin` against the served host (blocks cross-site POSTs without a hardcoded domain list, so previews and localhost work), caps the body at 16 KB, rate-limits per IP (in-memory, bounded; uses Netlify's `x-nf-client-connection-ip`), has a honeypot, validates with zod (`name` rejects line breaks), escapes HTML for the email body, and sends via Resend. Env is read through `lib/env.ts` (`server-only`, parsed lazily).
- `next.config.ts` — security headers incl. a CSP. Scripts use `'unsafe-inline'` on purpose: nonces would force per-request rendering and kill ISR. If you add a third-party script, frame, or fetch target, add its host to the matching directive there.
- `lib/content.ts` — blog slugs are whitelisted to `[a-z0-9-]` and `app/blog/[slug]` sets `dynamicParams = false`, so only pre-generated posts resolve. MDX is compiled from `content/`, i.e. blog content is code — only commit posts you'd run.
- `lib/data.ts` — homepage bento-grid stats. GitHub + Hugging Face are unauthenticated public-API `fetch` calls with `next.revalidate: 3600`, and `app/page.tsx` exports `revalidate = 3600`, so the homepage is ISR — **don't add `cache: 'no-store'`, `cookies()`, `headers()` etc. to the homepage render path**, it silently flips the route to per-request rendering (an earlier Strava integration did exactly that; Strava was removed in Sep 2026 after Strava deactivated the API app). Claude stats come from the bundled `public/data.json` (static import, not `fs`), which is also the fallback for the two live fetches.
- `public/data.json` — committed, durable record of Claude Code usage. `scripts/sync-claude-stats.py` (`pnpm sync-stats`) merges `~/.claude/stats-cache.json` (the same numbers `/usage` shows), `history.jsonl`, and the session transcripts into the `claude` key — field-wise max per day, never dropping a day, because Claude Code prunes its transcripts after ~30 days and the cache is a rolling window too. It writes nothing if unchanged. `scripts/sync-and-push.sh` wraps it for launchd (`scripts/com.matthewmcdowall.portfolio-stats.plist`: 06:00 daily + 12:00 retry, 20h throttle, commits only that path, refuses to run off `main`); the push is what triggers the Netlify deploy. Only aggregate counts are written — no prompts or paths.
- `scripts/` — Python needs only the stdlib; the shell script sets its own `PATH` because launchd's is minimal.
- `components/ClientBehaviors.tsx`, `components/BentoData.tsx` — client-side DOM manipulation (`useEffect` + `document.getElementById`) for scroll-reveal, nav highlighting, the terminal intro animation, draggable hero tags, and populating the bento stats/heatmap. This is intentionally imperative (ported from the original static HTML/JS site), not idiomatic React state — match that style when touching these files rather than converting to React state.
- `app/globals.css` — single ~1200-line stylesheet for the whole site (not Tailwind utility classes for most of the UI, despite Tailwind being a dependency).

## Env vars
`lib/env.ts` is the source of truth and matches `.env.local.example`: `RESEND_API_KEY`, `CONTACT_TO`, optional `RESEND_FROM` (contact form). No other feature needs a secret; the live-stat APIs are public.

## Known gaps
- `pnpm-workspace.yaml` exists but there's nothing else in the workspace — likely leftover, not a real monorepo.
- No analytics. `@vercel/analytics` / `@vercel/speed-insights` were removed in Sep 2026 — they only work behind Vercel's `/_vercel/*` proxy and 404'd on Netlify. If analytics come back, add the vendor's hosts to the CSP in `next.config.ts`.
- Dependabot (`.github/dependabot.yml`) opens weekly grouped PRs; run `pnpm audit` after merging.
