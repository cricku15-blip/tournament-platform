import { test, expect } from "@playwright/test";

test.describe("Foundation Smoke Tests", () => {
  test("landing page renders successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Sports Tournament Platform/);
  });

  test("UI catalog renders and components are visible", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page.getByRole("heading", { name: "UI Component Library" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Primary Button" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
  });
});
