import { test, expect } from "@playwright/test";
import { hudReadoutVisible, waitForAmbient, waitForPage } from "./helpers";

// The HUD is the site's signature, but it is not allowed to compete with the
// copy. Two rules, both asked for directly:
//   - it stands down entirely across About, which runs from the heading through
//     the tech marquees ([data-ambient="calm"] on the section)
//   - elsewhere it fades per element over text and cards (fadeOver in Ambient.tsx)
test.describe("ambient restraint", () => {
  test.slow();

  test("the HUD stands down across About and comes back after it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await page.goto("/");
    await waitForPage(page);
    await waitForAmbient(page);

    const at = async (sel: string | null) => {
      await page.evaluate((s) => {
        const y = s ? (document.querySelector(s)!.getBoundingClientRect().top + window.scrollY - 70) : 0;
        window.scrollTo({ top: y, behavior: "instant" });
      }, sel);
      await page.waitForTimeout(1_400); // hudAlpha eases at 0.18/frame
      return hudReadoutVisible(page);
    };

    expect(await at(null), "HUD runs on the hero").toBe(true);
    expect(await at("#about"), "HUD stands down at About").toBe(false);
    expect(await at(".about-marquees"), "still down across the tech marquees").toBe(false);
    expect(await at("#experience"), "HUD returns after About").toBe(true);
  });

  test("the backdrop keeps moving if the clip dies under it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await page.goto("/");
    await waitForPage(page);
    await waitForAmbient(page);

    const moving = (ms = 1800) => page.evaluate(async (d) => {
      const sleep = (x: number) => new Promise((r) => setTimeout(r, x));
      const bg = document.getElementById("ambient-bg") as HTMLCanvasElement;
      const g = bg.getContext("2d")!;
      const sum = () => {
        const data = g.getImageData(0, 0, bg.width, bg.height).data;
        let s = 0;
        for (let i = 0; i < data.length; i += 4 * 97) s = (s + data[i] * 3 + data[i + 3]) % 1000003;
        return s;
      };
      const a = sum();
      await sleep(d);
      return a !== sum();
    }, ms);

    expect(await moving(), "backdrop runs on the clip").toBe(true);

    // A dropped connection, or a dev server restarting under an open tab: the
    // clip stops advancing. processVideo() then returns null every frame, so
    // without the stall guard the scene is never marked dirty again and the
    // backdrop stays frozen for the life of the page.
    await page.evaluate(() => {
      const v = document.getElementById("ambient-video") as HTMLVideoElement;
      v.removeAttribute("src");
      v.load();
    });
    await page.waitForTimeout(6_000); // past the give-up threshold
    expect(await moving(), "falls back to the drawn scene rather than freezing").toBe(true);
  });

  test("effects never sit on a card at full strength", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measured once, on desktop");
    await page.goto("/");
    await waitForPage(page);
    await waitForAmbient(page);
    await page.evaluate(() => {
      const el = document.querySelector("#experience")!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "instant" });
    });
    await page.waitForTimeout(1_400);

    const fades = await page.evaluate(() => {
      const fadeAt = (window as Window & { __fadeAt?: (x: number, y: number, w: number, h: number) => number }).__fadeAt!;
      const card = Array.from(document.querySelectorAll(".timeline-item, .card")).find((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.height > 60;
      })!;
      const r = card.getBoundingClientRect();
      const f = (x: number, y: number) => fadeAt(x - 70, y - 45, 140, 90);
      return { onCard: f(r.left + r.width / 2, r.top + r.height / 2), inGutter: f(Math.max(50, r.left - 90), r.top + r.height / 2) };
    });

    expect(fades.onCard, "an effect over a card is faded out").toBeLessThan(0.2);
    expect(fades.inGutter, "the margins are left alone").toBeGreaterThan(0.9);
  });
});
