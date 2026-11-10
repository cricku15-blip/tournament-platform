import { expect, test } from "@playwright/test";

test.describe("auth pages (logged out)", () => {
  test("login shows Google and email options and validates email", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("signup links to login and shows terms", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: "Terms" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("check-email without an address offers a new link", async ({ page }) => {
    await page.goto("/auth/check-email?expired=1");
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  });

  test("protected pages redirect to login with next", async ({ page }) => {
    for (const path of ["/dashboard", "/profile", "/settings", "/notifications"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=%2F${path.slice(1)}`));
    }
  });

  test("open redirects are ignored", async ({ page }) => {
    await page.goto("/login?next=//evil.com");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});
