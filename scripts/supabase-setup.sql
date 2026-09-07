-- Patrimoine.net — installation du schéma sur Supabase.
-- Fichier généré par `npm run db:sql`. Ne pas modifier à la main.
--
-- Utilisation : Supabase → SQL Editor → coller ce fichier → Run.
-- À exécuter une seule fois, sur une base vide.
-- Équivalent à `npm run db:migrate` : le journal de migrations est renseigné,
-- donc une future migration ne rejouera pas ces instructions.

CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- 0000_initial_schema
CREATE TYPE "public"."asset_category" AS ENUM('REAL_ESTATE', 'CASH', 'SAVINGS', 'ETF', 'STOCK', 'BOND', 'PEA', 'CTO', 'LIFE_INSURANCE', 'PEE', 'SCPI', 'CRYPTO', 'VEHICLE', 'COLLECTIBLE', 'OTHER');

CREATE TYPE "public"."currency_code" AS ENUM('EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD');

CREATE TYPE "public"."income_frequency" AS ENUM('MONTHLY', 'YEARLY', 'IRREGULAR');

CREATE TYPE "public"."income_type" AS ENUM('SALARY', 'RENT', 'DIVIDENDS', 'INTEREST', 'BUSINESS', 'OTHER');

CREATE TYPE "public"."liability_type" AS ENUM('MORTGAGE', 'CONSUMER_LOAN', 'STUDENT_LOAN', 'PERSONAL_LOAN', 'OTHER');

CREATE TYPE "public"."property_type" AS ENUM('PRIMARY_RESIDENCE', 'RENTAL', 'SECOND_HOME', 'COMMERCIAL', 'PARKING', 'OTHER');

CREATE TYPE "public"."valuation_type" AS ENUM('MANUAL', 'MARKET');

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "asset_category" NOT NULL,
	"subcategory" text,
	"name" text NOT NULL,
	"description" text,
	"currency" "currency_code" NOT NULL,
	"current_value_cents" bigint NOT NULL,
	"purchase_value_cents" bigint,
	"quantity" numeric(24, 8),
	"unit_price_cents" bigint,
	"ticker" text,
	"provider" text,
	"valuation_type" "valuation_type" DEFAULT 'MANUAL' NOT NULL,
	"manual_value_cents" bigint,
	"valued_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "real_estate_details" (
	"asset_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"property_type" "property_type" NOT NULL,
	"purchase_price_cents" bigint,
	"purchase_date" date,
	"location" text,
	"monthly_rent_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "real_estate_details" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "liabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "liability_type" NOT NULL,
	"name" text NOT NULL,
	"currency" "currency_code" NOT NULL,
	"initial_amount_cents" bigint NOT NULL,
	"remaining_amount_cents" bigint NOT NULL,
	"interest_rate_bps" integer,
	"monthly_payment_cents" bigint,
	"start_date" date,
	"end_date" date,
	"linked_asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "liabilities" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "income_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "income_type" NOT NULL,
	"name" text NOT NULL,
	"currency" "currency_code" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"frequency" "income_frequency" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "income_sources" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "portfolio_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"currency" "currency_code" NOT NULL,
	"gross_assets_cents" bigint NOT NULL,
	"liabilities_cents" bigint NOT NULL,
	"net_worth_cents" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "portfolio_snapshots" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "onboarding_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "onboarding_progress" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "real_estate_details" ADD CONSTRAINT "real_estate_details_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "real_estate_details" ADD CONSTRAINT "real_estate_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_linked_asset_id_assets_id_fk" FOREIGN KEY ("linked_asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "assets_user_id_idx" ON "assets" USING btree ("user_id");

CREATE INDEX "liabilities_user_id_idx" ON "liabilities" USING btree ("user_id");

CREATE INDEX "liabilities_linked_asset_idx" ON "liabilities" USING btree ("linked_asset_id");

CREATE INDEX "income_sources_user_id_idx" ON "income_sources" USING btree ("user_id");

CREATE UNIQUE INDEX "portfolio_snapshots_user_date_idx" ON "portfolio_snapshots" USING btree ("user_id","date");

CREATE POLICY "users_select_own" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "users"."id");

CREATE POLICY "users_insert_own" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "users"."id");

CREATE POLICY "users_update_own" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "users"."id") WITH CHECK ((select auth.uid()) = "users"."id");

CREATE POLICY "assets_select_own" ON "assets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "assets"."user_id");

CREATE POLICY "assets_insert_own" ON "assets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "assets"."user_id");

CREATE POLICY "assets_update_own" ON "assets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "assets"."user_id") WITH CHECK ((select auth.uid()) = "assets"."user_id");

CREATE POLICY "assets_delete_own" ON "assets" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "assets"."user_id");

CREATE POLICY "real_estate_details_select_own" ON "real_estate_details" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "real_estate_details"."user_id");

CREATE POLICY "real_estate_details_insert_own" ON "real_estate_details" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "real_estate_details"."user_id");

CREATE POLICY "real_estate_details_update_own" ON "real_estate_details" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "real_estate_details"."user_id") WITH CHECK ((select auth.uid()) = "real_estate_details"."user_id");

CREATE POLICY "real_estate_details_delete_own" ON "real_estate_details" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "real_estate_details"."user_id");

CREATE POLICY "liabilities_select_own" ON "liabilities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "liabilities"."user_id");

CREATE POLICY "liabilities_insert_own" ON "liabilities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "liabilities"."user_id");

CREATE POLICY "liabilities_update_own" ON "liabilities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "liabilities"."user_id") WITH CHECK ((select auth.uid()) = "liabilities"."user_id");

CREATE POLICY "liabilities_delete_own" ON "liabilities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "liabilities"."user_id");

CREATE POLICY "income_sources_select_own" ON "income_sources" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "income_sources"."user_id");

CREATE POLICY "income_sources_insert_own" ON "income_sources" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "income_sources"."user_id");

CREATE POLICY "income_sources_update_own" ON "income_sources" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "income_sources"."user_id") WITH CHECK ((select auth.uid()) = "income_sources"."user_id");

CREATE POLICY "income_sources_delete_own" ON "income_sources" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "income_sources"."user_id");

CREATE POLICY "portfolio_snapshots_select_own" ON "portfolio_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "portfolio_snapshots"."user_id");

CREATE POLICY "portfolio_snapshots_insert_own" ON "portfolio_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "portfolio_snapshots"."user_id");

CREATE POLICY "portfolio_snapshots_update_own" ON "portfolio_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "portfolio_snapshots"."user_id") WITH CHECK ((select auth.uid()) = "portfolio_snapshots"."user_id");

CREATE POLICY "portfolio_snapshots_delete_own" ON "portfolio_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "portfolio_snapshots"."user_id");

CREATE POLICY "onboarding_progress_select_own" ON "onboarding_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "onboarding_progress"."user_id");

CREATE POLICY "onboarding_progress_insert_own" ON "onboarding_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "onboarding_progress"."user_id");

CREATE POLICY "onboarding_progress_update_own" ON "onboarding_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "onboarding_progress"."user_id") WITH CHECK ((select auth.uid()) = "onboarding_progress"."user_id");

CREATE POLICY "onboarding_progress_delete_own" ON "onboarding_progress" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "onboarding_progress"."user_id");

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT '087f6cd88dc4f45eafa46513a51ad60c793adbf04e756ea1c9b16e632d4bbb29', 1788783811316
WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE "hash" = '087f6cd88dc4f45eafa46513a51ad60c793adbf04e756ea1c9b16e632d4bbb29');

