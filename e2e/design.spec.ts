import { expect, test } from "@playwright/test";

test("la page design présente les composants", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Principal" })).toBeVisible();
  await expect(page.getByText("Confirmé")).toBeVisible();
});

test("le bouton du thème passe en sombre et garde le choix", async ({ page }) => {
  await page.goto("/design");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Passer au thème sombre" }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Passer au thème clair" }).click();
  await expect(html).not.toHaveClass(/dark/);
});
