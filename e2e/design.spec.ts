import { expect, test } from "@playwright/test";

test("la page /design documente le système retenu et ses usages actuels", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1, name: "Système de design MyWork" })).toBeVisible();

  const current = page.getByTestId("design-current-system");
  await expect(current).toHaveAttribute("data-theme", "editorial");
  await expect(current.getByRole("heading", { name: "Système retenu : Éditorial" })).toBeVisible();
  await expect(current.getByRole("heading", { name: "Couleurs utilisées" })).toBeVisible();
  await expect(current.getByText("bg-primary text-primary-foreground", { exact: true })).toBeVisible();
  await expect(current.getByRole("heading", { name: "Typographie", exact: true })).toBeVisible();

  await current.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(current.getByRole("status").filter({ hasText: "Exemple enregistré." })).toBeVisible();

  // Les champs réutilisent le formulaire d'expérience de l'application.
  const fields = current.getByRole("heading", { name: "Input, Textarea, select natif et case à cocher" }).locator("../..");
  await fields.getByLabel("Poste", { exact: true }).fill("Designer produit");
  await fields.getByLabel("Type de contrat").selectOption("cdi");
  await expect(fields.getByLabel("Type de contrat")).toHaveValue("cdi");
  await fields.getByLabel("Poste actuel", { exact: true }).uncheck();
  await expect(fields.getByLabel("Fin", { exact: true })).toBeEnabled();

  const menu = current.getByRole("navigation", { name: "Exemple du menu des sections" });
  await expect(menu.getByRole("button", { name: /Offre freelance/ })).toHaveAttribute("aria-current", "true");
  await menu.getByRole("button", { name: /À propos/ }).click();
  await expect(menu.getByRole("button", { name: /À propos/ })).toHaveAttribute("aria-current", "true");
  await expect(current.getByRole("heading", { name: "À PROPOS", exact: true })).toBeVisible();
  await expect(current.getByRole("heading", { name: "Freelance", exact: true })).toBeVisible();
  await expect(page.locator("#cv-document")).toBeVisible();
});

test("les actions de liste et la confirmation de suppression restent des démonstrations", async ({ page }) => {
  await page.goto("/design");
  const list = page.getByRole("list", { name: "Expériences de démonstration" });
  const first = list.getByRole("listitem").first();

  await expect(first.getByRole("button", { name: "Monter", exact: true })).toBeDisabled();
  await first.getByRole("button", { name: "Masquer", exact: true }).click();
  await expect(first.getByText("Masqué", { exact: true })).toBeVisible();
  await first.getByRole("button", { name: "Afficher", exact: true }).click();
  await expect(first.getByText("Masqué", { exact: true })).toHaveCount(0);

  await first.getByRole("button", { name: "Descendre", exact: true }).click();
  await expect(list.getByRole("listitem").last()).toContainText("Consultante produit");
  await list.getByRole("listitem").last().getByRole("button", { name: "Modifier", exact: true }).click();
  await list.getByLabel("Poste", { exact: true }).fill("Designer produit");
  await list.getByRole("button", { name: "Enregistrer l’exemple" }).click();
  await expect(list.getByRole("listitem").last()).toContainText("Designer produit");

  await first.getByRole("button", { name: "Supprimer", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Supprimer cet élément ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await first.getByRole("button", { name: "Supprimer", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Réinitialiser la liste" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
});

test("les archives conservent quatre onglets et identifient la piste et le logo retenus", async ({ page }) => {
  await page.goto("/design");
  const archives = page.getByRole("region", { name: "Archives : pistes comparées le 2026-10-21" });
  const demo = archives.getByTestId("design-demo-container");
  await expect(archives.getByRole("tab")).toHaveCount(4);
  await expect(demo).toHaveAttribute("data-theme", "neutral");

  for (const [name, theme] of [
    [/Bleu Ardoise/, "blue"],
    [/Sauge/, "warm"],
    [/Éditorial.*Retenue/, "editorial"],
    [/Neutre/, "neutral"],
  ] as const) {
    await archives.getByRole("tab", { name }).click();
    await expect(demo).toHaveAttribute("data-theme", theme);
    await expect(page.getByTestId("design-current-system")).toHaveAttribute("data-theme", "editorial");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "editorial");
  }
  await expect(archives.getByRole("heading", { name: "Logos", exact: true })).toBeVisible();
  await expect(archives.getByText("Logo retenu", { exact: true })).toBeVisible();
});

test("le mode sombre change les couleurs réelles, les menus et reste mémorisé", async ({ page }) => {
  await page.goto("/design");
  const current = page.getByTestId("design-current-system");
  const primary = current.getByText("primary", { exact: true });
  const lightColor = await primary.evaluate((element) => getComputedStyle(element).backgroundColor);

  const mode = page.getByRole("switch", { name: "Afficher le système retenu en mode sombre" });
  await mode.click();
  await expect(mode).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByTestId("design-demo-container")).toHaveClass(/dark/);
  await expect.poll(() => primary.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightColor);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mywork-mode"))).toBe("dark");

  await page.reload();
  await expect(mode).toBeChecked();
  await page.getByRole("button", { name: "Camille Martin" }).click();
  await page.getByRole("menuitem", { name: "Thème", exact: true }).hover();
  await expect(page.getByRole("menuitemradio", { name: "Sombre", exact: true })).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Clair", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(mode).not.toBeChecked();
});
