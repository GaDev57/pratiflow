import { test, expect } from "@playwright/test";

test.describe("Authentication pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Connexion")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Créer un compte")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=incorrect")).toBeVisible({ timeout: 10000 });
  });

  test("login page links to signup", async ({ page }) => {
    await page.goto("/login");
    const signupLink = page.locator('a[href*="register"]');
    await expect(signupLink).toBeVisible();
  });

  test("signup page links to login", async ({ page }) => {
    await page.goto("/register");
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });
});
