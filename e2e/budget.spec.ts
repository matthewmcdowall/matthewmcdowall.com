import { test, expect } from "@playwright/test";

// What the visitor actually downloads. The site leans on video, so this keeps
// that honest: a new clip that doubles the payload fails here.
const BUDGET = {
  totalMB: 9,
  videoMB: 7,
  scriptKB: 900,
  requests: 60,
};

test.describe("resource budget", () => {
  test("the homepage payload stays within budget", async ({ page }, testInfo) => {
    // request.sizes() reports what actually came over the wire; Next serves
    // chunked, so content-length headers are missing and would read as zero.
    const seen = new Map<string, { bytes: number; type: string }>();
    page.on("requestfinished", async (req) => {
      const url = req.url();
      if (!url.startsWith("http")) return;
      try {
        const sizes = await req.sizes();
        const res = await req.response();
        const type = res ? (res.headers()["content-type"] ?? "") : "";
        const bytes = sizes.responseBodySize + sizes.responseHeadersSize;
        const prev = seen.get(url)?.bytes ?? 0;
        seen.set(url, { bytes: Math.max(prev, bytes), type: type || (seen.get(url)?.type ?? "") });
      } catch {
        /* request torn down with the page */
      }
    });

    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(6_000); // let the clips stream in

    let total = 0;
    let video = 0;
    let script = 0;
    for (const [u, v] of seen) {
      total += v.bytes;
      if (v.type.includes("video") || /\.mp4($|\?)/.test(u)) video += v.bytes;
      if (v.type.includes("javascript")) script += v.bytes;
    }
    const mb = (b: number) => b / 1024 / 1024;
    const biggest = [...seen.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 5);
    const summary = `total ${mb(total).toFixed(1)}MB (video ${mb(video).toFixed(1)}MB, js ${(script / 1024).toFixed(0)}KB) across ${seen.size} requests`;
    console.log(`[payload] ${summary}`);
    for (const [url, v] of biggest) console.log(`   ${mb(v.bytes).toFixed(2)}MB  ${url.replace(/^https?:\/\/[^/]+/, "")}`);
    testInfo.annotations.push({ type: "payload", description: summary });

    expect(mb(total)).toBeLessThan(BUDGET.totalMB);
    expect(mb(video)).toBeLessThan(BUDGET.videoMB);
    expect(script / 1024).toBeLessThan(BUDGET.scriptKB);
    expect(seen.size).toBeLessThan(BUDGET.requests);
  });

  test("video is not fetched when the visitor asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const videoRequests: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "media" || r.url().endsWith(".mp4")) videoRequests.push(r.url());
    });
    await page.goto("/");
    await page.waitForTimeout(4_000);
    console.log(`[reduced motion] video requests: ${videoRequests.length}`);
    expect(videoRequests, "no clips should be downloaded for a reduced-motion visitor").toEqual([]);
  });
});
