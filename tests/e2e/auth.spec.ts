import { expect, test } from "@playwright/test";
import { PASSWORD, register, uniqueEmail } from "./helpers";

test.describe("Authentication", () => {
  test("protected routes redirect anonymous visitors to login", async ({ page }) => {
    await page.goto("/world");
    await expect(page).toHaveURL(/\/login\?next=%2Fworld/);
    await page.goto("/assets");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows validation errors and rejects wrong credentials", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Adresse e-mail").fill("pas-un-email");
    await page.getByLabel("Mot de passe", { exact: true }).fill("court");
    await page.getByLabel("Confirmer le mot de passe").fill("autre");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Adresse e-mail").fill(uniqueEmail("nobody"));
    await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Adresse e-mail ou mot de passe incorrect.")).toBeVisible();
  });

  test("onboarding progress survives leaving and coming back", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    await page.getByRole("link", { name: "Commencer" }).click();
    await page.getByLabel("J'ai de l'épargne (livrets, comptes à terme)").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByRole("heading", { name: "Votre épargne" })).toBeVisible();
    await page.locator('[id="items.0.name"]').fill("Livret");
    await page.locator('[id="items.0.valueCents"]').fill("1500");
    await expect(page.getByRole("status").filter({ hasText: "Sauvegardé" })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/patrimoine");
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "Votre épargne" })).toBeVisible();
    await expect(page.locator('[id="items.0.name"]')).toHaveValue("Livret");
    // The draft is stored in cents and rendered back with two decimals.
    await expect(page.locator('[id="items.0.valueCents"]')).toHaveValue("1500,00");
  });
});
