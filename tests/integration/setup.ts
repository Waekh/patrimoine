import { beforeAll } from "vitest";
import { setupLocalDatabase } from "../../scripts/setup-local-db";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/patrimoine_test";

beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.AUTH_PROVIDER = "local";
  process.env.LOCAL_AUTH_SECRET = "integration-test-secret-0123456789";
  await setupLocalDatabase(TEST_DATABASE_URL);
});
