import { test, expect } from "@playwright/test";
import { GPU_ARGS, jsHeapMB, measureFrames, measureLongTasks, renderer, report, throttleCPU, waitForPage } from "./helpers";

// Performance budgets. The site runs two live canvases, video decode, a
// posterize pass and a glitch layer, so it has to prove it stays usable on a
// machine slower than the one it was built on. Numbers print on every run so a
// regression shows up even when it stays inside budget.

test.use({ launchOptions: { args: GPU_ARGS } });

test.describe("performance — accelerated, slower CPU", () => {
  test.slow();

  const BUDGET = {
    ambientFps4x: 24,
    ambientFps6x: 18,
    p95Ms: 60,
    jank: 0.2,
    heapMB: 150,
    longTaskMs: 600,
  };

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await page.goto("about:blank");
    const r = await renderer(page);
    test.skip(/swiftshader|software/i.test(r), `no GPU available here (${r}) — see the software floor specs`);
  });

  test("the ambient layer holds at 4x CPU throttle", async ({ page }, testInfo) => {
    await throttleCPU(page, 4);
    await page.goto("/");
    await waitForPage(page);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_500);
    const s = await measureFrames(page, 4_000);
    const heap = await jsHeapMB(page);
    report(testInfo, "ambient @4x", `${s.fps.toFixed(1)}fps p95=${s.p95.toFixed(0)}ms jank=${(s.jankRatio * 100).toFixed(0)}% heap=${heap.toFixed(0)}MB`);
    expect(s.fps).toBeGreaterThan(BUDGET.ambientFps4x);
    expect(s.p95).toBeLessThan(BUDGET.p95Ms);
    expect(s.jankRatio).toBeLessThan(BUDGET.jank);
    expect(heap).toBeLessThan(BUDGET.heapMB);
  });

  test("the ambient layer holds at 6x CPU throttle", async ({ page }, testInfo) => {
    await throttleCPU(page, 6);
    await page.goto("/");
    await waitForPage(page);
    await page.locator("#experience").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_800);
    const s = await measureFrames(page, 4_000);
    const heap = await jsHeapMB(page);
    report(testInfo, "ambient @6x", `${s.fps.toFixed(1)}fps p95=${s.p95.toFixed(0)}ms heap=${heap.toFixed(0)}MB`);
    expect(s.fps).toBeGreaterThan(BUDGET.ambientFps6x);
    expect(heap).toBeLessThan(BUDGET.heapMB);
  });

  test("nothing blocks the main thread for long", async ({ page }, testInfo) => {
    await throttleCPU(page, 4);
    await page.goto("/");
    const tasks = await measureLongTasks(page, 6_000);
    const worst = tasks.length ? Math.max(...tasks) : 0;
    report(testInfo, "long tasks @4x", `${tasks.length} tasks, worst ${worst.toFixed(0)}ms`);
    expect(worst).toBeLessThan(BUDGET.longTaskMs);
  });
});
