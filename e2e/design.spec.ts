import { expect, test } from "@playwright/test";

test("la page design présente les composants", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Principal" })).toBeVisible();
  await expect(page.getByText("Confirmé")).toBeVisible();
});
