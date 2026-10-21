import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("la page d'accueil propose de se connecter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
