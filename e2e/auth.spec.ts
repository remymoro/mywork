import { expect, test } from "@playwright/test";

test("la page de connexion propose Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
});

test("les pages privées renvoient vers la connexion", async ({ page }) => {
  for (const path of ["/dashboard", "/dashboard/profil"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("un pseudo inconnu affiche une page 404", async ({ page }) => {
  await page.goto("/ce-pseudo-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});
