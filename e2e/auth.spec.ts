import { expect, test } from "@playwright/test";

test("la page de connexion propose Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
});

test("les pages privées renvoient vers la connexion", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("un pseudo inconnu affiche une page 404", async ({ page }) => {
  const response = await page.goto("/ce-pseudo-n-existe-pas");
  expect(response?.status()).toBe(404);
});
