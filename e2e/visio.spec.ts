import { expect, test } from "@playwright/test";

test("un lien visio mal formé affiche une page introuvable", async ({ page }) => {
  const response = await page.goto("/rdv/pas-un-code/visio");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["permissions-policy"]).toBe("camera=(self), microphone=(self)");
});

test("la visio propriétaire demande une connexion", async ({ page }) => {
  await page.goto("/dashboard/rendez-vous/9a8b7c6d-1111-4222-8333-444455556666/visio");
  await expect(page).toHaveURL(/\/login$/);
});

test("la page introuvable de visio reste lisible sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/rdv/pas-un-code/visio");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
