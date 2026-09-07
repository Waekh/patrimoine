import "dotenv/config";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquante. Copiez .env.example vers .env.");
    process.exit(1);
  }
  return url;
}
