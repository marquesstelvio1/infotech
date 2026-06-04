import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { utilizadores } from "../schema";
import { AuthRequest } from "../middlewares/auth";

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ erro: "Email e password são obrigatórios" });

  const [utilizador] = await db
    .select()
    .from(utilizadores as any)
    .where(eq(utilizadores.email as any, email));

  if (!utilizador || !utilizador.ativo)
    return res.status(401).json({ erro: "Credenciais inválidas" });

  const passwordCorreta = await bcrypt.compare(password, utilizador.passwordHash);
  if (!passwordCorreta)
    return res.status(401).json({ erro: "Credenciais inválidas" });

  const token = jwt.sign(
    { id: utilizador.id, email: utilizador.email, role: utilizador.role },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  return res.json({
    token,
    utilizador: {
      id: utilizador.id,
      nome: utilizador.nome,
      email: utilizador.email,
      role: utilizador.role,
    },
  });
};

// POST /api/auth/registro (apenas admin)
export const registro = async (req: Request, res: Response) => {
  const { nome, email, password, role, telefone } = req.body;

  if (!nome || !email || !password)
    return res.status(400).json({ erro: "Nome, email e password são obrigatórios" });

  const [existe] = await db
    .select()
    .from(utilizadores as any)
    .where(eq(utilizadores.email as any, email));

  if (existe)
    return res.status(409).json({ erro: "Email já registado" });

  const passwordHash = await bcrypt.hash(password, 10);

  const [novo] = await db
    .insert(utilizadores as any)
    .values({ nome, email, passwordHash, role: role ?? "atendente", telefone })
    .returning();

  return res.status(201).json({
    id: novo.id,
    nome: novo.nome,
    email: novo.email,
    role: novo.role,
  });
};

export const listarUtilizadores = async (_req: Request, res: Response) => {
  const lista = await db
    .select()
    .from(utilizadores as any);

  const usuariosSemSenha = lista.map((usuario: any) => {
    const { passwordHash, ...rest } = usuario;
    return rest;
  });

  return res.json(usuariosSemSenha);
};

const PROTEGIDOS = [
  "admin@infotech.ao",
  "stelvio715@gmail.com",
];

export const atualizarUtilizador = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { ativo } = req.body;

  if (typeof ativo !== "boolean")
    return res.status(400).json({ erro: "Campo ativo obrigatório" });

  const [usuarioExistente] = await db
    .select()
    .from(utilizadores as any)
    .where(eq(utilizadores.id as any, id));

  if (!usuarioExistente)
    return res.status(404).json({ erro: "Utilizador não encontrado" });

  if (!ativo && PROTEGIDOS.includes(usuarioExistente.email))
    return res.status(400).json({ erro: "Não é possível desativar este utilizador protegido" });

  if (req.utilizador?.id === id)
    return res.status(400).json({ erro: "Não é possível desativar o próprio utilizador" });

  const [utilizadorAtualizado] = await db
    .update(utilizadores as any)
    .set({ ativo, updatedAt: new Date() })
    .where(eq(utilizadores.id as any, id))
    .returning();

  if (!utilizadorAtualizado)
    return res.status(404).json({ erro: "Utilizador não encontrado" });

  const { passwordHash, ...rest } = utilizadorAtualizado;
  return res.json(rest);
};
