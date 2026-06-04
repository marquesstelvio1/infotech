import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function buildPostgresClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada");
  }

  return postgres(databaseUrl, {
    ssl: "require",
  });
}

export const client = buildPostgresClient();

export const db = drizzle(client, { schema });
