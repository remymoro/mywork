import { expect, test } from "@playwright/test";

test("le profil de démonstration affiche toutes les sections remplies", async ({ page }) => {
  await page.goto("/design/profil");
  await expect(page.getByRole("heading", { name: "Camille Durand", level: 1 })).toBeVisible();
  await expect(page.getByText("Développeuse full-stack · Indépendante").first()).toBeVisible();
  for (const name of ["À PROPOS", "EXPÉRIENCE", "FORMATION", "COMPÉTENCES", "LANGUES", "CERTIFICATIONS", "PROJETS"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("complementary").getByRole("heading", { name: "Freelance" })).toBeVisible();
  await expect(page.getByText("520 € HT / jour")).toBeVisible();

  await page.getByRole("button", { name: "Afficher l'e-mail" }).click();
  await expect(page.getByRole("link", { name: "camille.durand@exemple.fr" })).toBeVisible();
});
