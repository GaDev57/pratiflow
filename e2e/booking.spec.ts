import { test, expect } from "@playwright/test";

test.describe("Public booking page", () => {
  test("displays practitioner info or 404 gracefully", async ({ page }) => {
    await page.goto("/book/test-practitioner");
    const pageContent = await page.textContent("body");
    if (pageContent?.includes("introuvable") || pageContent?.includes("404")) {
      test.skip(true, "No test practitioner in DB");
      return;
    }
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("booking page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/book/test-practitioner");
    const pageContent = await page.textContent("body");
    if (pageContent?.includes("introuvable")) {
      test.skip(true, "No test practitioner in DB");
      return;
    }
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
