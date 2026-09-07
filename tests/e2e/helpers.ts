import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}

export const PASSWORD = "motdepasse-e2e-1234";

export async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmer le mot de passe").fill(PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/(world|onboarding)/);
}

export async function logout(page: Page): Promise<void> {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Se déconnecter" }).first().click();
  await expect(page).toHaveURL(/\/login/);
}

/** Fills a CurrencyInput (the visible field is the "_display" mirror). */
export async function fillMoney(page: Page, id: string, value: string): Promise<void> {
  await page.locator(`[id="${id}"]`).fill(value);
}

export async function continueStep(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuer" }).click();
}

/** Completes the minimal vertical slice: residence + cash + ETF + one liability. */
export async function completeOnboarding(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
  await page.getByRole("link", { name: "Commencer" }).click();

  await expect(page.getByRole("heading", { name: "Votre situation patrimoniale" })).toBeVisible();
  await page.getByLabel("Je suis propriétaire de ma résidence principale").check();
  await page.getByLabel("J'ai des comptes bancaires (comptes courants)").check();
  await page.getByLabel("J'ai des investissements financiers").check();
  await page.getByLabel("J'ai des dettes ou crédits en cours").check();
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Votre résidence principale" })).toBeVisible();
  await fillMoney(page, "valueCents", "400000");
  await fillMoney(page, "remainingDebtCents", "250000");
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Vos comptes bancaires" })).toBeVisible();
  await page.locator('[id="items.0.name"]').fill("Compte courant");
  await fillMoney(page, "items.0.valueCents", "30000");
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Vos investissements" })).toBeVisible();
  await page.getByLabel("ETF", { exact: true }).check();
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Vos ETF" })).toBeVisible();
  await page.locator('[id="items.0.name"]').fill("ETF MSCI World");
  await fillMoney(page, "items.0.valueCents", "100000");
  await fillMoney(page, "items.0.purchaseValueCents", "85000");
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Vos dettes" })).toBeVisible();
  await page.locator('[id="items.0.name"]').fill("Prêt auto");
  await fillMoney(page, "items.0.initialAmountCents", "10000");
  await fillMoney(page, "items.0.remainingAmountCents", "5000");
  await continueStep(page);

  await expect(page.getByRole("heading", { name: "Vérification" })).toBeVisible();
  await expect(page.getByText("275 000 €")).toBeVisible();
  await page.getByRole("link", { name: "Continuer" }).click();

  await expect(page.getByRole("heading", { name: "Votre patrimoine est prêt." })).toBeVisible();
  await page.getByRole("button", { name: "Générer mon monde" }).click();
  await expect(page).toHaveURL(/\/world/);
}
