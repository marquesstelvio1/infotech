import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { utilizadores } from "../database/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada");
}

const client = postgres(databaseUrl, {
  ssl: "require",
});

const db = drizzle(client);

function getSeedCredentials() {
  const email = (process.env.DEV_EMAIL ?? "admin@infotech.ao").trim();
  const password = (process.env.DEV_PASS ?? "admin123").trim();
  const nome = (process.env.DEV_NAME ?? "Administrador").trim();

  return { email, password, nome };
}

async function seed() {
  const { email, password, nome } = getSeedCredentials();

  const [existente] = await db
    .select()
    .from(utilizadores)
    .where(eq(utilizadores.email, email));

  const passwordHash = await bcrypt.hash(password, 10);

  if (existente) {
    await db
      .update(utilizadores)
      .set({
        nome,
        passwordHash,
        role: "admin",
        ativo: true,
      })
      .where(eq(utilizadores.email, email));

    console.log("⚠️  Utilizador de desenvolvimento atualizado na BD.");
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    await client.end();
    return;
  }

  await db.insert(utilizadores).values({
    nome,
    email,
    passwordHash,
    role: "admin",
    ativo: true,
  });

  console.log("✅ Utilizador de desenvolvimento criado com sucesso!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   ⚠️  Muda a password após o primeiro login!");

  await client.end();
}

seed().catch((e) => {
  console.error("❌ Erro ao criar utilizador de desenvolvimento:", e);
  process.exit(1);
});
