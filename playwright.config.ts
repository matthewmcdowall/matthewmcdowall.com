import { defineConfig, devices } from "@playwright/test";

// E2E + performance budgets for the site.
//
// The point of this suite is not only "does it render" but "does it still run
// on a machine that isn't a fast laptop". The perf specs throttle the CPU
// through the DevTools protocol and assert frame-rate and memory budgets, so a
// new feature that quietly makes the ambient canvas or the intro twice as
// expensive fails here instead of on someone's old ThinkPad.
//
//   pnpm test:e2e            all specs
//   pnpm test:e2e:ui         pick and watch them
//   pnpm test:e2e perf       just the budgets
export default defineConfig({
  testDir: "./e2e",
  // One worker: these specs measure frame timings, and parallel browsers would
  // contend for the same CPU and make the numbers meaningless.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm build && pnpm start -p 3100",
        url: "http://localhost:3100",
        timeout: 240_000,
        // never reuse: a server started before a rebuild serves stale chunk
        // hashes and 500s, which would silently invalidate every measurement
        reuseExistingServer: false,
        stdout: "ignore",
        stderr: "pipe",
      },
});
