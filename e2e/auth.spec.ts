import { expect, test } from "@playwright/test";

test("la page de connexion propose Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
});

test("les pages privées renvoient vers la connexion", async ({ page }) => {
  for (const path of ["/dashboard", "/dashboard/profil", "/dashboard/profil/cv", "/dashboard/kanban", "/dashboard/fichiers", "/dashboard/rendez-vous"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("un pseudo inconnu affiche une page 404", async ({ page }) => {
  await page.goto("/ce-pseudo-n-existe-pas");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});

// Le Kanban n'a plus de page publique : l'ancienne adresse ne mène à rien.
test("aucune page publique de tableau Kanban", async ({ page }) => {
  await page.goto("/remy/kanban/x");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});

// Un fichier du Drive n'est téléchargeable que s'il est public : sinon (ou s'il n'existe pas), rien.
test("le téléchargement d'un fichier inconnu ou privé est refusé", async ({ request }) => {
  for (const path of ["/remy/ressources/pas-un-id", "/remy/ressources/9a8b7c6d-1111-4222-8333-444455556666"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
  }
});

// Le lien privé d'un rendez-vous (reçu par e-mail) : un code faux ou inconnu ne montre rien.
test("un lien de rendez-vous inconnu ou mal formé affiche une page 404", async ({ page }) => {
  for (const path of ["/rdv/pas-un-code", "/rdv/9a8b7c6d-1111-4222-8333-444455556666"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  }
});
