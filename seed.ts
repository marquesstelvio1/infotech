
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./database/schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  const email    = "admin@infotech.ao";
  const password = "admin123";
  const nome     = "Administrador";

  // Verificar se já existe
  const [existente] = await db
    .select()
    .from(schema.utilizadores)
    .where(eq(schema.utilizadores.email, email));

  if (existente) {
    console.log("  Admin já existe na BD.");
    await client.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(schema.utilizadores).values({
    nome,
    email,
    passwordHash,
    role: "admin",
    ativo: true,
  });

  console.log("✅ Admin criado com sucesso!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("Muda a password após o primeiro login!");

  await client.end();
}

seed().catch((e) => {
  console.error("Erro ao criar admin:", e);
  process.exit(1);
});