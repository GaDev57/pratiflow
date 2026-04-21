import { test, expect } from "@playwright/test";

test.describe("Dashboard (protected routes)", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 });
    expect(page.url()).toContain("login");
  });

  test("privacy page is publicly accessible", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("text=Politique de confidentialité")).toBeVisible();
  });

  test("home page renders", async ({ page }) => {
    await page.goto("/");
    expect(await page.title()).toBeTruthy();
  });
});
