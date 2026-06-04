import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { movimentos, produtos } from "../../../database/schema";
import { AuthRequest } from "./auth";

// GET /api/movimentos
export const listarMovimentos = async (_req: Request, res: Response) => {
  const lista = await (db.query as any).movimentos.findMany({
    with: {
      produto:    { columns: { id: true, nome: true } },
      utilizador: { columns: { id: true, nome: true } },
    },
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
  });
  return res.json(lista);
};

// GET /api/movimentos/produto/:produtoId
export const movimentosPorProduto = async (req: Request, res: Response) => {
  const lista = await (db.query as any).movimentos.findMany({
    where: eq(movimentos.produtoId as any, req.params.produtoId as string),
    with: {
      utilizador: { columns: { id: true, nome: true } },
    },
    orderBy: (m: any, { desc }: any) => [desc(m.createdAt)],
  });
  return res.json(lista);
};

// POST /api/movimentos (entrada manual ou ajuste de stock)
export const criarMovimento = async (req: AuthRequest, res: Response) => {
  const { produtoId, tipo, quantidade, motivo } = req.body;

  if (!produtoId || !tipo || quantidade === undefined)
    return res.status(400).json({ erro: "produtoId, tipo e quantidade são obrigatórios" });

  if (!["entrada", "ajuste", "devolucao"].includes(tipo))
    return res.status(400).json({ erro: "Tipo inválido. Use: entrada, ajuste ou devolucao" });

  const [produto] = await db
    .select()
    .from(produtos as any)
    .where(eq(produtos.id as any, produtoId));

  if (!produto)
    return res.status(404).json({ erro: "Produto não encontrado" });

  const stockAntes = Number(produto.stock);
  const stockDepois = tipo === "ajuste" ? quantidade : stockAntes + quantidade;

  // Atualizar stock
  await db
    .update(produtos as any)
    .set({ stock: stockDepois, updatedAt: new Date() })
    .where(eq(produtos.id as any, produtoId));

  // Registar movimento
  const [novoMovimento] = await db
    .insert(movimentos as any)
    .values({
      produtoId,
      utilizadorId: req.utilizador?.id,
      tipo,
      quantidade: tipo === "ajuste" ? quantidade - stockAntes : quantidade,
      stockAntes,
      stockDepois,
      motivo,
    })
    .returning();

  return res.status(201).json(novoMovimento);
};