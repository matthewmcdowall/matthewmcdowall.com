import { test, expect } from "@playwright/test";
import { jsHeapMB, measureFrames, report, throttleCPU, waitForPage } from "./helpers";

// Performance budgets. The site runs two live canvases, video decode, a
// posterize pass and a glitch layer, so it has to prove it stays usable on a
// machine slower than the one it was built on. Numbers print on every run so a
// regression shows up even when it stays inside budget.

test.use({ launchOptions: { args: ["--disable-gpu", "--disable-gpu-compositing"] } });

test.describe("performance — software rendering, the floor", () => {
  test.slow();

  test("degrades instead of locking up, and stays interactive", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await throttleCPU(page, 4);
    await page.goto("/");
    await waitForPage(page);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await page.waitForTimeout(5_000); // give the quality guard time to settle

    const s = await measureFrames(page, 4_000);
    const heap = await jsHeapMB(page);
    const backdrop = await page.evaluate(() => (window as Window & { __ambientQuality?: number }).__ambientQuality ?? 1);
    report(testInfo, "software @4x", `${s.fps.toFixed(1)}fps p95=${s.p95.toFixed(0)}ms heap=${heap.toFixed(0)}MB backdrop=${backdrop}x`);

    // The quality guard is a safety net, not a requirement — demanding that it
    // fire meant this failed the moment the page got fast enough not to need
    // it. What matters is that a weak machine stays usable, and that the guard
    // did cut the expensive work if the page actually struggled.
    expect(s.fps, "still animating, not frozen").toBeGreaterThan(15);
    if (s.fps < 24) {
      expect(backdrop, "a struggling page must cut backdrop resolution").toBeLessThanOrEqual(0.5);
    }
    expect(heap, "memory must not balloon on a weak machine").toBeLessThan(150);

    // and crucially it must still respond to input
    await page.evaluate(() => {
      (window as Window & { __clicked?: boolean }).__clicked = false;
      document.addEventListener("pointerdown", () => ((window as Window & { __clicked?: boolean }).__clicked = true), { once: true });
    });
    await page.mouse.click(30, 30);
    await page.waitForFunction(() => (window as Window & { __clicked?: boolean }).__clicked === true, undefined, { timeout: 5_000 });
  });
});
