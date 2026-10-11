import { test, expect } from "@playwright/test";
import { collectPageErrors, waitForPage } from "./helpers";

const ROUTES = ["/", "/blog", "/contact", "/blog/hello-world"];

test.describe("smoke", () => {
  for (const route of ROUTES) {
    test(`${route} loads clean`, async ({ page }) => {
      const errors = collectPageErrors(page);
      const res = await page.goto(route);
      expect(res?.status(), `${route} status`).toBe(200);
      await expect(page.locator("body")).toBeVisible();
      expect(errors, `${route} console/page errors`).toEqual([]);
    });
  }

  test("homepage structure is all there", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    for (const id of ["#about", "#experience", "#education", "#blog", "#contact"]) {
      await expect(page.locator(id), `section ${id}`).toHaveCount(1);
    }
    await expect(page.locator("h1")).toContainText("Matthew McDowall");
    // the nav should mirror the sections that exist
    const links = await page.locator(".nav-links a").allTextContents();
    expect(links.map((t) => t.trim().toLowerCase())).toEqual([
      "about",
      "experience",
      "education",
      "blog",
      "contact",
    ]);
  });

  test("experience carries the work, not a projects section", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    const experience = page.locator("#experience");
    await expect(experience).toContainText("North Light AI");
    await expect(experience).toContainText("Prime Ready");
    await expect(experience).toContainText("Lesson Desk");
    await expect(experience).toContainText("SubCom");
    await expect(experience).toContainText("SBDC");
    // Lesson Desk copy was rewritten away from naming the model
    await expect(experience).toContainText("University of New Hampshire");
    await expect(page.locator("#projects")).toHaveCount(0);
  });

  test("blog section lists real posts and placeholders", async ({ page }) => {
    await page.goto("/");
    await waitForPage(page);
    const blog = page.locator("#blog");
    await expect(blog.locator("a.blog-card")).toHaveCount(1);
    await expect(blog.locator(".blog-card-empty")).toHaveCount(2);
    await expect(blog).toContainText("Hello, world");
    // the date is rendered in UTC: a post dated the 19th must not read the 18th
    await expect(blog.locator(".blog-date").first()).toContainText("Apr 19, 2026");
  });

  test("search metadata is intact", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Matthew McDowall .*Applied AI Engineer/);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toContain("Matthew McDowall");
    expect(desc).toMatch(/RAG|LLM/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe("https://matthewmcdowall.com");
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    const graph = JSON.parse(ld ?? "{}");
    expect(JSON.stringify(graph)).toContain("Person");
  });

  test("robots and sitemap serve", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap:");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<loc>");
  });

  test("contact form is present and honest about the agent", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/contact");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.locator("main")).toContainText("an agent reads every one");
    expect(errors).toEqual([]);
  });
});
