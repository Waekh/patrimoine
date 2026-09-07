import { expect, test } from "@playwright/test";

test.describe("Public pages", () => {
  test("home explains the product and links to registration", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Votre patrimoine devient un monde." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer mon monde" })).toBeVisible();
    const body = await page.textContent("body");
    expect(body).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  test("demo world renders the fictional dataset without an account", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/demo");
    await expect(page.getByText("360 000 €").first()).toBeVisible();
    await expect(page.getByText("Démonstration : données fictives.")).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Bâtiments du monde" }).click();
    await page.getByRole("button", { name: /Résidence principale/ }).click();
    const panel = page.getByRole("region", { name: "Résidence principale" });
    await expect(panel.getByText("400 000 €")).toBeVisible();
    await expect(panel.getByText("Crédit immobilier")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(1);
  });
});
