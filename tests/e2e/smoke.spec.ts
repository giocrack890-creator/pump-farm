import { test, expect } from "@playwright/test";

test.describe("Hood Harvest smoke", () => {
  test("lobby loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Hood Harvest|trade fees|Silo/i }).first()).toBeVisible();
  });

  test("play shows connect prompt", async ({ page }) => {
    await page.goto("/play");
    await expect(page.getByText(/Connect/i).first()).toBeVisible();
  });
});
