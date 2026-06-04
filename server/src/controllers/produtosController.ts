import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { produtos, movimentos } from "../schema";
import { AuthRequest } from "./auth";

// GET /api/produtos
export const listarProdutos = async (_req: Request, res: Response) => {
  const lista = await db.select().from(produtos as any).orderBy((produtos as any).createdAt);
  return res.json(lista);
};

// GET /api/produtos/:id
export const obterProduto = async (req: Request, res: Response) => {
  const { id } = req.params;

  const [produto] = await db.select().from(produtos as any).where(eq((produtos as any).id, id as string));

  if (!produto)
    return res.status(404).json({ erro: "Produto não encontrado" });

  return res.json(produto);
};

// POST /api/produtos
export const criarProduto = async (req: AuthRequest, res: Response) => {
  const { nome, categoria, marca, modelo, numeroSerie, stock, precoCompra, precoVenda, observacoes } = req.body;
  const stockValue = Number(stock ?? 0);
  const precoVendaValue = Number(precoVenda ?? 0);

  if (!nome || !categoria || !precoVenda)
    return res.status(400).json({ erro: "Nome, categoria e preço de venda são obrigatórios" });

  if (stockValue < 0)
    return res.status(400).json({ erro: "O stock não pode ser negativo" });

  if (stockValue > precoVendaValue)
    return res.status(400).json({ erro: "O stock não pode ultrapassar o preço de venda" });

  const estado = stockValue <= 0 ? "indisponivel" : "disponivel";

  const [novo] = await db
    .insert(produtos as any)
    .values({ nome, categoria, marca, modelo, numeroSerie, stock: stockValue, precoCompra, precoVenda: precoVendaValue, observacoes, estado })
    .returning();

  if (stockValue > 0) {
    await db.insert(movimentos as any).values({
      produtoId: novo.id,
      utilizadorId: req.utilizador?.id,
      tipo: "entrada",
      quantidade: stockValue,
      stockAntes: 0,
      stockDepois: stockValue,
      motivo: "Entrada inicial de stock",
    });
  }

  return res.status(201).json(novo);
};

// PUT /api/produtos/:id
export const atualizarProduto = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const dados = req.body;

  const [produtoAtual] = await db.select().from(produtos as any).where(eq((produtos as any).id, id as string));

  if (!produtoAtual)
    return res.status(404).json({ erro: "Produto não encontrado" });

  const updatedStock = dados.stock !== undefined ? Number(dados.stock) : produtoAtual.stock;
  const updatedPrecoVenda = dados.precoVenda !== undefined ? Number(dados.precoVenda) : Number(produtoAtual.precoVenda);

  if (updatedStock < 0)
    return res.status(400).json({ erro: "O stock não pode ser negativo" });

  if (updatedStock > updatedPrecoVenda)
    return res.status(400).json({ erro: "O stock não pode ultrapassar o preço de venda" });

  let novoEstado = dados.estado ?? produtoAtual.estado;
  if (updatedStock <= 0) {
    novoEstado = "indisponivel";
  } else if (produtoAtual.estado === "indisponivel" && dados.estado === undefined) {
    novoEstado = "disponivel";
  }

  const dadosAtualizaveis = {
    nome: dados.nome,
    categoria: dados.categoria,
    marca: dados.marca,
    modelo: dados.modelo,
    numeroSerie: dados.numeroSerie,
    precoCompra: dados.precoCompra,
    precoVenda: dados.precoVenda,
    observacoes: dados.observacoes,
  };

  const [atualizado] = await db
    .update(produtos as any)
    .set({ ...dadosAtualizaveis, stock: updatedStock, estado: novoEstado, updatedAt: new Date() })
    .where(eq((produtos as any).id, id as string))
    .returning();

  if (dados.stock !== undefined && updatedStock !== produtoAtual.stock) {
    await db.insert(movimentos as any).values({
      produtoId: atualizado.id,
      utilizadorId: req.utilizador?.id,
      tipo: updatedStock > produtoAtual.stock ? "entrada" : "ajuste",
      quantidade: updatedStock - produtoAtual.stock,
      stockAntes: produtoAtual.stock,
      stockDepois: updatedStock,
      motivo: "Ajuste de stock",
    });
  }

  return res.json(atualizado);
};

// DELETE /api/produtos/:id
export const eliminarProduto = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const [produto] = await db.select().from(produtos as any).where(eq((produtos as any).id, id as string));

  if (!produto)
    return res.status(404).json({ erro: "Produto não encontrado" });

  if (produto.stock > 0) {
    await db.insert(movimentos as any).values({
      produtoId: produto.id,
      utilizadorId: req.utilizador?.id,
      tipo: "ajuste",
      quantidade: -produto.stock,
      stockAntes: produto.stock,
      stockDepois: 0,
      motivo: "Eliminação de produto",
    });
  }

  const [eliminado] = await db
    .delete(produtos as any)
    .where(eq((produtos as any).id, id as string))
    .returning();

  if (!eliminado)
    return res.status(404).json({ erro: "Produto não encontrado" });

  return res.json({ mensagem: "Produto eliminado com sucesso" });
};
