import { expect, test } from "@playwright/test";

test("la racine mène directement à la page de connexion", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
});
