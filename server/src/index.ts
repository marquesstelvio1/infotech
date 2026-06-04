import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { client } from "./db";
import path from "path";

const app = express();
const PORT = process.env.PORT ?? 3000;

async function applyStartupMigrations() {
  await client.unsafe(`DO $$ BEGIN
    ALTER TYPE "public"."estado_produto" ADD VALUE 'indisponivel';
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;`);

  await client.unsafe(`ALTER TABLE "vendas" ADD COLUMN IF NOT EXISTS "payment_method" varchar(50);`);
}

async function main() {
  await applyStartupMigrations();

  // ─── Middlewares globais ─────────────────
  app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173" }));
  app.use(express.json());

  // ─── Rotas ──────────────────────────────
  // Servir assets públicos (imagens de produtos)
  app.use("/assets/products", express.static(path.join(__dirname, "..", "public", "assets", "products")));
  app.use("/api", routes);

  // ─── Health check ───────────────────────
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // ─── Start ──────────────────────────────
  app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar o servidor:", err);
  process.exit(1);
});