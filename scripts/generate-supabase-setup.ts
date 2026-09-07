import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Produces a single SQL file, equivalent to `npm run db:migrate`, that can be
 * pasted into the Supabase SQL Editor when no terminal is available.
 *
 * It applies every migration and records them in Drizzle's journal
 * (drizzle.__drizzle_migrations), so a later `npm run db:migrate` sees them as
 * already applied instead of trying to replay them.
 */
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");
const OUTPUT = path.join(process.cwd(), "scripts", "supabase-setup.sql");

interface JournalEntry {
  tag: string;
  when: number;
}

function main(): void {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8"),
  ) as {
    entries: JournalEntry[];
  };

  const parts: string[] = [
    "-- Patrimoine.net — installation du schéma sur Supabase.",
    "-- Fichier généré par `npm run db:sql`. Ne pas modifier à la main.",
    "--",
    "-- Utilisation : Supabase → SQL Editor → coller ce fichier → Run.",
    "-- À exécuter une seule fois, sur une base vide.",
    "-- Équivalent à `npm run db:migrate` : le journal de migrations est renseigné,",
    "-- donc une future migration ne rejouera pas ces instructions.",
    "",
    'CREATE SCHEMA IF NOT EXISTS "drizzle";',
    'CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (',
    "  id SERIAL PRIMARY KEY,",
    "  hash text NOT NULL,",
    "  created_at bigint",
    ");",
    "",
  ];

  for (const entry of journal.entries) {
    const file = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
    const raw = readFileSync(file, "utf8");
    // Drizzle hashes the untouched file content; the marker is only a separator.
    const hash = createHash("sha256").update(raw).digest("hex");
    parts.push(`-- ${entry.tag}`, raw.split("--> statement-breakpoint").join("\n").trim(), "");
    parts.push(
      `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")`,
      `SELECT '${hash}', ${entry.when}`,
      `WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "hash" = '${hash}');`,
      "",
    );
  }

  writeFileSync(OUTPUT, `${parts.join("\n")}\n`);
  console.log(`${OUTPUT} généré (${journal.entries.length} migration(s)).`);
}

main();
