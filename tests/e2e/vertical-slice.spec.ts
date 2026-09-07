import { expect, test } from "@playwright/test";
import { completeOnboarding, fillMoney, login, logout, register, uniqueEmail } from "./helpers";

test.describe("Vertical slice", () => {
  test("register, onboarding, net worth, world, buildings, detail, edit, logout, login again", async ({
    page,
    isMobile,
  }) => {
    const email = uniqueEmail();
    await register(page, email);
    await completeOnboarding(page);

    // World: net worth in the HUD and the world level.
    await expect(page.getByText("275 000 €").first()).toBeVisible();
    await expect(page.getByText("Bourg").first()).toBeVisible();

    // Select a building from the accessible list (desktop side panel or mobile sheet).
    if (isMobile) {
      await page.getByRole("button", { name: "Bâtiments du monde" }).click();
    }
    await page.getByRole("button", { name: /ETF MSCI World/ }).click();
    const panel = page.getByRole("region", { name: "ETF MSCI World" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("100 000 €")).toBeVisible();
    await expect(panel.getByText("85 000 €")).toBeVisible();
    await expect(panel.getByText("+17 647,06 %").or(panel.getByText("+17,65 %"))).toBeVisible();
    await panel.getByRole("button", { name: "Fermer" }).click();

    // Net worth page.
    await page.goto("/patrimoine");
    await expect(page.getByText("275 000 €").first()).toBeVisible();
    await expect(page.getByText("530 000 €").first()).toBeVisible();
    await expect(page.getByText("255 000 €").first()).toBeVisible();

    // Create an asset and a liability through the forms.
    await page.goto("/assets/new");
    await page.getByLabel("Catégorie").selectOption("SAVINGS");
    await page.getByLabel("Nom").fill("Livret A");
    await fillMoney(page, "manualValueCents", "20000");
    await page.getByRole("button", { name: "Ajouter un actif" }).click();
    await expect(page).toHaveURL(/\/assets\?created=/);
    await expect(page.getByText("Livret A")).toBeVisible();

    await page.goto("/liabilities/new");
    await page.getByLabel("Nom").fill("Crédit conso");
    await page.getByLabel("Type").selectOption("CONSUMER_LOAN");
    await fillMoney(page, "initialAmountCents", "8000");
    await fillMoney(page, "remainingAmountCents", "2000");
    await page.getByRole("button", { name: "Ajouter une dette" }).click();
    await expect(page).toHaveURL(/\/liabilities\?created=/);
    await expect(page.getByText("Crédit conso")).toBeVisible();

    // 275 000 + 20 000 - 2 000
    await page.goto("/patrimoine");
    await expect(page.getByText("293 000 €").first()).toBeVisible();

    // Edit the ETF and see the world update.
    await page.goto("/assets");
    await page
      .getByRole("row", { name: /ETF MSCI World/ })
      .getByRole("link", { name: "Modifier" })
      .click();
    await fillMoney(page, "manualValueCents", "150000");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/assets\?updated=/);
    await page.goto("/world");
    await expect(page.getByText("343 000 €").first()).toBeVisible();
    await expect(page.getByText("Ville").first()).toBeVisible();

    // History has a snapshot.
    await page.goto("/history");
    await expect(page.getByRole("table")).toBeVisible();

    await logout(page);
    await login(page, email);
    await expect(page).toHaveURL(/\/world/);
    await expect(page.getByText("343 000 €").first()).toBeVisible();
  });
});
