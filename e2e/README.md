# End-to-end tests and performance budgets

```
pnpm test:e2e      # everything (desktop + mobile), ~5 min
pnpm test:perf     # just the budgets, ~2 min
pnpm test:e2e:ui   # pick and watch individual specs
```

Playwright builds the site and serves it on :3100 itself. It never reuses an
already-running server: one started before a rebuild serves stale chunk hashes,
500s on every script, and would silently turn every measurement into a
measurement of a blank page.

## What is covered

| spec | what it protects |
| --- | --- |
| `smoke` | every route loads with no console errors; sections, nav, experience entries, blog cards, metadata, robots/sitemap, contact form |
| `intro` | the opening paints, the clip advances, it hands over — and still hands over when autoplay is refused or the clip 404s; hero sequence and generated CTA; reduced motion skips it |
| `budget` | what a visitor downloads, and that a reduced-motion visitor downloads no video at all |
| `perf-accelerated` | frame rate, jank, heap and long tasks with GPU compositing and a CPU 4–6x slower than a current laptop |
| `perf-software` | the floor: no GPU at all. Asserts the site *notices* and drops its backdrop resolution rather than grinding, and stays interactive |
| `perf` | interactivity during the opening, idling in a hidden tab, mobile viewport |

## Reading the numbers

Every perf spec prints its measurement, so a change that stays inside budget but
moves the number is still visible in the log:

```
[ambient @4x] 30.1fps p95=33ms jank=0% heap=20MB
[software @4x] 15.4fps p95=100ms heap=22MB backdrop=0.35x
[payload] total 5.4MB (video 5.1MB, js 156KB) across 17 requests
```

The budgets sit below the measured values with headroom. If a new feature
pushes one over, either the feature needs to get cheaper or the budget needs a
deliberate, argued change — not a quiet bump.

## The two scenarios, and why

Headless Chromium has **no GPU by default** — it rasterises through SwiftShader
in software, which is far slower than any real browser. Measuring only that
would have made the site look broken; measuring only the accelerated path would
have missed the worst case. So both run, with separate budgets, and the
accelerated specs skip themselves with a message if the machine has no GPU.
