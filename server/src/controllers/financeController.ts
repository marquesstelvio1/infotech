import { Request, Response } from "express";
import { db } from "../db";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

// GET /api/finance/resumo
export const getResumoFinanceiro = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    // Receitas: somar vendas no período
    const todasVendas: any[] = await (db.query as any).vendas.findMany({});
    const vendasFiltradas = todasVendas.filter((v) => {
      if (!startDate && !endDate) return true;
      const d = new Date(v.dataVenda).toISOString().split("T")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
    const receitas = vendasFiltradas.reduce((acc, v) => acc + Number(v.totalVenda), 0);

    // Despesas / Prejuízos: considerar movimentos do tipo 'ajuste' (sem venda) com quantidade negativa
    const movimentos: any[] = await (db.query as any).movimentos.findMany({ with: { produto: true } });
    const movimentosFiltrados = movimentos.filter((m) => {
      // ajuste sem venda e quantidade negativa => produto eliminado/prejuizo
      if (m.tipo !== "ajuste") return false;
      if (m.vendaId) return false;
      if (Number(m.quantidade) >= 0) return false;
      if (!m.produto) return false;
      // date filter if provided
      if (startDate || endDate) {
        const d = new Date(m.createdAt).toISOString().split("T")[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      return true;
    });

    // despesas = sum(precoCompra * (-quantidade)) para cada movimento filtrado
    const despesas = movimentosFiltrados.reduce((acc, m) => {
      const precoCompra = m.produto?.precoCompra ? Number(m.produto.precoCompra) : 0;
      const qtd = Math.abs(Number(m.quantidade));
      return acc + precoCompra * qtd;
    }, 0);

    const lucro = receitas - despesas;
    const caixaAtual = receitas - despesas; // simplificado: caixa = receitas - prejuizos

    return res.json({ receitas, despesas, lucro, caixaAtual });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao calcular resumo financeiro" });
  }
};

// GET /api/finance/top-products
export const topProdutos = async (_req: Request, res: Response) => {
  try {
    const itens: any[] = await (db.query as any).itensVenda.findMany({ with: { produto: true } });

    const mapa: Record<string, { produtoId: string; nome: string; quantidade: number }> = {};

    for (const item of itens) {
      const pid = item.produtoId;
      if (!mapa[pid]) mapa[pid] = { produtoId: pid, nome: item.produto?.nome ?? "-", quantidade: 0 };
      mapa[pid].quantidade += Number(item.quantidade);
    }

    const arr = Object.values(mapa).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

    return res.json(arr);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Erro ao obter top produtos" });
  }
};

// GET /api/finance/export-pdf
export const exportFinancePdf = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const todasVendas: any[] = await (db.query as any).vendas.findMany({});
    const vendasFiltradas = todasVendas.filter((v) => {
      if (!startDate && !endDate) return true;
      const d = new Date(v.dataVenda).toISOString().split("T")[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
    const receitas = vendasFiltradas.reduce((acc, v) => acc + Number(v.totalVenda), 0);

    const movimentos: any[] = await (db.query as any).movimentos.findMany({ with: { produto: true } });
    const movimentosFiltrados = movimentos.filter((m) => {
      if (m.tipo !== "ajuste") return false;
      if (m.vendaId) return false;
      if (Number(m.quantidade) >= 0) return false;
      if (!m.produto) return false;
      if (startDate || endDate) {
        const d = new Date(m.createdAt).toISOString().split("T")[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      return true;
    });

    const despesas = movimentosFiltrados.reduce((acc, m) => {
      const precoCompra = m.produto?.precoCompra ? Number(m.produto.precoCompra) : 0;
      const qtd = Math.abs(Number(m.quantidade));
      return acc + precoCompra * qtd;
    }, 0);

    const lucro = receitas - despesas;

    const top = await (db.query as any).itensVenda.findMany({ with: { produto: true } });

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = new PassThrough();
    res.setHeader("Content-disposition", `attachment; filename=financas-${new Date().toISOString().slice(0,10)}.pdf`);
    res.setHeader("Content-type", "application/pdf");
    doc.pipe(stream);

    doc.fontSize(18).text("Resumo Financeiro", { align: "left" });
    doc.moveDown();
    doc.fontSize(12).text(`Receitas: ${receitas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz`);
    doc.text(`Despesas: ${despesas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz`);
    doc.text(`Lucro: ${lucro.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz`);
    doc.moveDown();

    doc.fontSize(14).text("Top produtos (amostra):");
    doc.moveDown(0.5);

    const mapa: Record<string, { produtoId: string; nome: string; quantidade: number }> = {};
    for (const item of top) {
      const pid = item.produtoId;
      if (!mapa[pid]) mapa[pid] = { produtoId: pid, nome: item.produto?.nome ?? "-", quantidade: 0 };
      mapa[pid].quantidade += Number(item.quantidade);
    }

    const arr = Object.values(mapa).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);

    arr.forEach((p, idx) => {
      doc.text(`${idx + 1}. ${p.nome} — ${p.quantidade}`);
    });

    doc.end();
    stream.pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: "Falha ao gerar PDF" });
  }
};
