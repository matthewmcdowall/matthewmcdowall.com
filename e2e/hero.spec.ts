import { test, expect } from "@playwright/test";
import { canvasHasInk, collectPageErrors, waitForPage } from "./helpers";

// There is no opening animation: the homepage is the homepage. These cover what
// used to be gated behind it — the hero types itself out on mount, the call to
// action writes itself on screen, and the ambient layer paints underneath.
test.describe("homepage", () => {
  test("loads straight into the page, with no opening overlay", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");
    await expect(page.locator("#siteContent")).toBeVisible();
    await expect(page.locator("#introOverlay")).toHaveCount(0);
    await expect(page.locator("h1")).toContainText("Matthew McDowall");
    expect(errors).toEqual([]);
  });

  test("the ambient layer is painting", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    // The backdrop holds off until the hero has finished typing, which takes
    // the better part of half a minute — Ambient.tsx drops .ambient-waiting off
    // the root when it goes live. Assert on the backdrop, not the HUD: the HUD
    // deliberately keeps clear of text, so whether it has painted anything at a
    // given instant depends on where the tracked subjects happen to be.
    await page.waitForFunction(() => !document.documentElement.classList.contains("ambient-waiting"), undefined, { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    expect(await canvasHasInk(page, "#ambient-bg"), "ambient backdrop is painting").toBe(true);
  });

  test("hero sequence types through to the ask", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    const seq = page.locator("#heroSeq");
    await expect(seq.locator(".hero-slide-statement")).toHaveClass(/active/);
    await expect(seq).toContainText("I build real AI products", { timeout: 12_000 });
    // then it cuts to the ask, which stays
    await expect(seq.locator(".hero-slide-ask")).toHaveClass(/active/, { timeout: 20_000 });
    await expect(seq).toContainText("Got an idea?", { timeout: 12_000 });
  });

  test("the call to action is generated, then live", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    const gen = page.locator("#ctaGen");
    await expect(gen).toHaveClass(/generating/, { timeout: 20_000 });
    await expect(page.locator("#ctaCode")).toContainText("cta.tsx", { timeout: 20_000 });
    await expect(gen).toHaveClass(/live/, { timeout: 25_000 });
    const cta = page.locator("#ctaLive");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "#contact");
  });

  test("reduced motion stills the page but keeps the copy readable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#siteContent")).toBeVisible();
    await expect(page.locator("#heroSeq")).toContainText("I build real AI products");
  });
});
