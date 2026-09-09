import { test, expect } from "@playwright/test";

test.describe("Pump Farm smoke", () => {
  test("lobby loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Grow Green Candles/i })).toBeVisible();
  });

  test("play shows connect prompt", async ({ page }) => {
    await page.goto("/play");
    await expect(page.getByText(/Connect/i).first()).toBeVisible();
  });
});
