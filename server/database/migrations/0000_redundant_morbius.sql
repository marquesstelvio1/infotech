DO $$ BEGIN
 CREATE TYPE "public"."categoria_produto" AS ENUM('computador_desktop', 'laptop', 'monitor', 'impressora', 'servidor', 'switch_rede', 'router', 'tablet', 'smartphone', 'periferico', 'outro');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."estado_produto" AS ENUM('disponivel', 'vendido', 'reservado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role_utilizador" AS ENUM('admin', 'desenvolvedor', 'atendente');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."tipo_movimento" AS ENUM('entrada', 'saida', 'ajuste', 'devolucao');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "itens_venda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"preco_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"utilizador_id" uuid,
	"venda_id" uuid,
	"tipo" "tipo_movimento" NOT NULL,
	"quantidade" integer NOT NULL,
	"stock_antes" integer NOT NULL,
	"stock_depois" integer NOT NULL,
	"motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(200) NOT NULL,
	"categoria" "categoria_produto" NOT NULL,
	"marca" varchar(100),
	"modelo" varchar(150),
	"numero_serie" varchar(200),
	"estado" "estado_produto" DEFAULT 'disponivel' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"preco_compra" numeric(10, 2),
	"preco_venda" numeric(10, 2) NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"qr_code" uuid DEFAULT gen_random_uuid() NOT NULL,
	CONSTRAINT "produtos_numero_serie_unique" UNIQUE("numero_serie"),
	CONSTRAINT "produtos_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "utilizadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role_utilizador" DEFAULT 'atendente' NOT NULL,
	"telefone" varchar(20),
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "utilizadores_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendedor_id" uuid,
	"comprador_nome" varchar(200) NOT NULL,
	"comprador_email" varchar(255),
	"comprador_telefone" varchar(20),
	"total_venda" numeric(10, 2) NOT NULL,
	"data_venda" date NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "itens_venda" ADD CONSTRAINT "itens_venda_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_utilizador_id_utilizadores_id_fk" FOREIGN KEY ("utilizador_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_venda_id_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."vendas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendas" ADD CONSTRAINT "vendas_vendedor_id_utilizadores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."utilizadores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
