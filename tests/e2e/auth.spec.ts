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

  test("the home page reflects the session", async ({ page }) => {
    // Scoped to the header: "Créer mon monde" in the hero also contains "mon monde".
    const nav = page.locator("header nav");
    await page.goto("/");
    await expect(nav.getByRole("link", { name: "Se connecter" })).toBeVisible();

    await register(page, uniqueEmail());
    await page.goto("/");
    // Regression guard: a statically prerendered home page served the anonymous
    // header to signed-in visitors.
    await expect(nav.getByRole("link", { name: "Mon monde", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Se connecter" })).toHaveCount(0);
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
