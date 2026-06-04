import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { vendas, itensVenda, movimentos, produtos } from "../schema";
import { AuthRequest } from "./auth";

// GET /api/vendas
export const listarVendas = async (_req: Request, res: Response) => {
  const lista = await (db.query as any).vendas.findMany({
    with: {
      atendente: { columns: { id: true, nome: true } },
      itensVenda: {
        with: { produto: { columns: { id: true, nome: true, marca: true } } },
      },
    },
    orderBy: (t: any, { desc }: any) => [desc(t.createdAt)],
  });
  return res.json(lista);
};

// GET /api/vendas/:id
export const obterVenda = async (req: Request, res: Response) => {
  const venda = await (db.query as any).vendas.findFirst({
    where: eq(vendas.id as any, req.params.id as string),
    with: {
      atendente: { columns: { id: true, nome: true } },
      itensVenda: {
        with: { produto: true },
      },
    },
  });

  if (!venda)
    return res.status(404).json({ erro: "Venda não encontrada" });

  return res.json(venda);
};

// POST /api/vendas
export const criarVenda = async (req: AuthRequest, res: Response) => {
  const { compradorNome, compradorEmail, compradorTelefone, paymentMethod, dataVenda, observacoes, itens } = req.body;

  // itens: [{ produtoId, quantidade, precoUnitario }]
  if (!compradorNome || !itens || itens.length === 0)
    return res.status(400).json({ erro: "Nome do comprador e itens são obrigatórios" });

  // Calcular total
  const totalVenda = itens.reduce(
    (acc: number, item: { quantidade: number; precoUnitario: number }) =>
      acc + item.quantidade * item.precoUnitario,
    0
  );

  // Criar venda
  const [novaVenda] = await db
    .insert(vendas as any)
    .values({
      atendenteId: req.utilizador?.id,
      compradorNome,
      compradorEmail,
      compradorTelefone,
      paymentMethod,
      totalVenda: totalVenda.toFixed(2),
      dataVenda: dataVenda ?? new Date().toISOString().split("T")[0],
      observacoes,
    })
    .returning();

  // Inserir itens e atualizar stock
  for (const item of itens) {
    if (item.quantidade <= 0)
      return res.status(400).json({ erro: "Quantidade inválida em pelo menos um item." });

    const [produto] = await db
      .select()
      .from(produtos as any)
      .where(eq(produtos.id as any, item.produtoId));

    if (!produto)
      return res.status(400).json({ erro: `Produto com id ${item.produtoId} não encontrado.` });

    const stockAntes = Number(produto.stock);
    if (item.quantidade > stockAntes)
      return res.status(400).json({ erro: `Stock insuficiente para o produto ${produto.nome}.` });

    const stockDepois = stockAntes - item.quantidade;
    const novoEstado = stockDepois <= 0 ? "indisponivel" : produto.estado === "indisponivel" ? "disponivel" : produto.estado;
    const subtotal = item.quantidade * item.precoUnitario;

    // Inserir item da venda
    await db.insert(itensVenda as any).values({
      vendaId: novaVenda.id,
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario.toFixed(2),
      subtotal: subtotal.toFixed(2),
    });

    // Atualizar stock do produto
    await db
      .update(produtos as any)
      .set({ stock: stockDepois, estado: novoEstado, updatedAt: new Date() })
      .where(eq(produtos.id as any, item.produtoId));

    // Registar movimento de saída
    await db.insert(movimentos as any).values({
      produtoId: item.produtoId,
      utilizadorId: req.utilizador?.id,
      vendaId: novaVenda.id,
      tipo: "saida",
      quantidade: -item.quantidade,
      stockAntes,
      stockDepois,
      motivo: `Venda #${novaVenda.id}`,
    });
  }

  return res.status(201).json({ mensagem: "Venda criada com sucesso", venda: novaVenda });
};
