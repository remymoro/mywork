import { expect, test } from "@playwright/test";

test("la page /design permet de comparer les variantes et le mode sombre", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1, name: "Système de design MyWork" })).toBeVisible();

  const demo = page.getByTestId("design-demo-container");
  await expect(demo).toHaveAttribute("data-theme", "neutral");

  await page.getByRole("tab", { name: /Bleu Ardoise/ }).click();
  await expect(demo).toHaveAttribute("data-theme", "blue");

  await page.getByRole("tab", { name: /Sauge/ }).click();
  await expect(demo).toHaveAttribute("data-theme", "warm");

  await page.getByRole("tab", { name: /Éditorial/ }).click();
  await expect(demo).toHaveAttribute("data-theme", "editorial");
  await expect(demo.getByText("ESPACE PRIVÉ").first()).toBeVisible();

  await expect(page.getByRole("heading", { name: /Logos/ })).toBeVisible();

  await page.getByRole("switch", { name: "Basculer le conteneur de démo en mode sombre" }).click();
  await expect(demo).toHaveClass(/dark/);
});
