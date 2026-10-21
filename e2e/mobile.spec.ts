import { expect, test } from "@playwright/test";

for (const width of [320, 390]) {
  test(`la connexion reste lisible sur un écran de ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("/login");

    await expect(page.getByText("Se connecter", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
}
