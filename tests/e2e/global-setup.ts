import { setupLocalDatabase } from "../../scripts/setup-local-db";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/patrimoine_test";

export default async function globalSetup(): Promise<void> {
  await setupLocalDatabase(E2E_DATABASE_URL);
}
