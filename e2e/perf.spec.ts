import { test, expect } from "@playwright/test";
import { measureFrames, report, throttleCPU, waitForPage, jsHeapMB } from "./helpers";

// Performance budgets. The site runs two live canvases, video decode, a
// posterize pass and a glitch layer, so it has to prove it stays usable on a
// machine slower than the one it was built on. Numbers print on every run so a
// regression shows up even when it stays inside budget.

test.describe("performance — everywhere", () => {
  test("the page is interactive while the ambient layer runs", async ({ page }) => {
    await throttleCPU(page, 4);
    await page.goto("/");
    await page.waitForTimeout(1_200);
    await page.evaluate(() => {
      (window as Window & { __clicked?: boolean }).__clicked = false;
      document.addEventListener("pointerdown", () => ((window as Window & { __clicked?: boolean }).__clicked = true), { once: true });
    });
    await page.mouse.click(20, 20);
    await page.waitForFunction(() => (window as Window & { __clicked?: boolean }).__clicked === true, undefined, { timeout: 4_000 });
  });

  test("the loops stop when the tab is hidden", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await page.goto("/");
    await waitForPage(page);
    await page.waitForTimeout(800);
    const stillDrawing = await page.evaluate(async () => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      const c = document.getElementById("ambient-hud") as HTMLCanvasElement | null;
      const ctx = c?.getContext("2d");
      if (!ctx || !c) return true;
      const sample = () => ctx.getImageData(0, 0, Math.min(200, c.width), 8).data.join(",");
      const before = sample();
      await new Promise((r) => setTimeout(r, 900));
      return before !== sample();
    });
    report(testInfo, "hidden tab", `hud redrawing: ${stillDrawing}`);
    expect(stillDrawing, "the ambient loop must idle in a background tab").toBe(false);
  });

  test("mobile viewport stays animating", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile project only");
    await throttleCPU(page, 4);
    await page.goto("/");
    await waitForPage(page);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_500);
    const s = await measureFrames(page, 3_000);
    const heap = await jsHeapMB(page);
    report(testInfo, "mobile @4x", `${s.fps.toFixed(1)}fps p95=${s.p95.toFixed(0)}ms heap=${heap.toFixed(0)}MB`);
    expect(s.fps).toBeGreaterThan(8);
    expect(heap).toBeLessThan(150);
  });
});
