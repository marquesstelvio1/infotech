DO $$ BEGIN
  ALTER TYPE "public"."estado_produto" ADD VALUE IF NOT EXISTS 'indisponivel';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public"."vendas"
  ADD COLUMN IF NOT EXISTS "payment_method" varchar(50);
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
