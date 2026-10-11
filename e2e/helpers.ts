import type { Page, CDPSession } from "@playwright/test";


/** Slow the CPU down to emulate a cheaper machine. 1 = no throttling. */
export async function throttleCPU(page: Page, rate: number): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  return cdp;
}

export interface FrameStats {
  fps: number;
  frames: number;
  elapsed: number;
  p50: number;
  p95: number;
  worst: number;
  /** share of frames that took longer than 50ms — visible stutter */
  jankRatio: number;
}

/** Sample requestAnimationFrame gaps for `ms`, so we measure what the user sees. */
export async function measureFrames(page: Page, ms: number): Promise<FrameStats> {
  return page.evaluate(async (duration) => {
    return await new Promise<FrameStats>((resolve) => {
      const gaps: number[] = [];
      let last = performance.now();
      const t0 = last;
      const tick = (now: number) => {
        gaps.push(now - last);
        last = now;
        if (now - t0 < duration) requestAnimationFrame(tick);
        else {
          const sorted = [...gaps].sort((a, b) => a - b);
          const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
          const elapsed = now - t0;
          resolve({
            frames: gaps.length,
            elapsed,
            fps: (gaps.length / elapsed) * 1000,
            p50: at(0.5),
            p95: at(0.95),
            worst: sorted[sorted.length - 1] ?? 0,
            jankRatio: gaps.filter((g) => g > 50).length / Math.max(1, gaps.length),
          });
        }
      };
      requestAnimationFrame(tick);
    });
  }, ms) as Promise<FrameStats>;
}

/** Long tasks block input; anything over ~200ms is felt as a freeze. */
export async function measureLongTasks(page: Page, ms: number): Promise<number[]> {
  return page.evaluate(async (duration) => {
    return await new Promise<number[]>((resolve) => {
      const tasks: number[] = [];
      let obs: PerformanceObserver | undefined;
      try {
        obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) tasks.push(e.duration);
        });
        obs.observe({ entryTypes: ["longtask"] });
      } catch {
        /* not supported: report none */
      }
      setTimeout(() => {
        obs?.disconnect();
        resolve(tasks);
      }, duration);
    });
  }, ms);
}

export async function jsHeapMB(page: Page): Promise<number> {
  return page.evaluate(() => {
    const m = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return m ? m.usedJSHeapSize / 1024 / 1024 : 0;
  });
}

/**
 * The page is up and its client behaviours have mounted. There is no opening
 * animation any more; the ambient canvas only exists once Ambient.tsx has run,
 * so it is the cheapest proof that client JS is live.
 */
export async function waitForPage(page: Page, timeout = 20_000) {
  await page.waitForSelector("#siteContent", { state: "visible", timeout });
  await page.waitForFunction(() => !!document.getElementById("ambient-bg"), undefined, { timeout });
}

/** Collects console errors and uncaught exceptions for the life of the page. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Is the canvas actually painting, or is it a blank rectangle? */
/**
 * Is the HUD readout strip along the bottom of the screen painting? That strip
 * fades with hudAlpha and no feed window ever draws there, so it is the
 * cleanest read on whether the HUD is standing down.
 */
export async function hudReadoutVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const c = document.getElementById("ambient-hud") as HTMLCanvasElement | null;
    if (!c || !c.width) return false;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    const dpr = c.width / window.innerWidth;
    const { data } = ctx.getImageData(0, Math.floor((window.innerHeight - 30) * dpr), c.width, Math.floor(28 * dpr));
    for (let i = 3; i < data.length; i += 4) if (data[i] > 12) return true;
    return false;
  });
}

/** Waits until Ambient.tsx has taken over from the hero sequence. */
export async function waitForAmbient(page: Page, timeout = 45_000) {
  await page.waitForFunction(() => !document.documentElement.classList.contains("ambient-waiting"), undefined, { timeout });
  await page.waitForTimeout(1_200);
}

export async function canvasHasInk(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel) as HTMLCanvasElement | null;
    if (!c || !c.width || !c.height) return false;
    const ctx = c.getContext("2d");
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.length; i += 4 * 97) {
      if (data[i + 3] > 8) return true; // any non-transparent pixel
    }
    return false;
  }, selector);
}

/** Chromium flags that turn on real GPU compositing. */
export const GPU_ARGS = [
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  ...(process.platform === "darwin" ? ["--use-angle=metal"] : []),
];

/** What is actually rasterising: "SwiftShader" means software rendering. */
export async function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    return dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "unknown";
  });
}

/** Log a measurement and attach it to the report, so runs stay comparable. */
export function report(testInfo: { annotations: { type: string; description?: string }[] }, label: string, text: string) {
  console.log(`[${label}] ${text}`);
  testInfo.annotations.push({ type: label, description: text });
}
