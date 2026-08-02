import { expect, test } from "@playwright/test";

const username = process.env.E2E_ADMIN_USERNAME ?? "admin";
const password = process.env.E2E_ADMIN_PASSWORD ?? "admin123";

test("sign-in reaches the authenticated shell with keyboard-accessible navigation", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#login-username")).toBeVisible();
  await page.locator("#login-username").fill(username);
  await page.locator("#login-password").fill(password);
  await page.locator("form").getByRole("button", { name: /log in|sign in|giriş yap/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main")).toBeVisible();

  // The mobile tab bar is absent on desktop but must be reachable and named on
  // a touch viewport. This catches accidental removal of its accessible nav.
  if (test.info().project.name === "mobile") {
    const navigation = page.getByRole("navigation", { name: /menu|menü/i });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("button", { name: /account|hesap/i }).focus();
    await expect(navigation.getByRole("button", { name: /account|hesap/i })).toBeFocused();
  }
});
