import api from "./api";
import type { AuthResponse, Produto, Venda, Movimento } from "../types";

// Auth 
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },
};

// Produtos
export const produtosService = {
  listar: async (): Promise<Produto[]> => {
    const { data } = await api.get("/produtos");
    return data;
  },
  obter: async (id: string): Promise<Produto> => {
    const { data } = await api.get(`/produtos/${id}`);
    return data;
  },
  criar: async (produto: Partial<Produto>): Promise<Produto> => {
    const { data } = await api.post("/produtos", produto);
    return data;
  },
  atualizar: async (id: string, produto: Partial<Produto>): Promise<Produto> => {
    const { data } = await api.put(`/produtos/${id}`, produto);
    return data;
  },
  eliminar: async (id: string): Promise<void> => {
    await api.delete(`/produtos/${id}`);
  },
  uploadImage: async (id: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    const { data } = await api.post(`/produtos/${id}/image`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return data;
  },
  fetchImage: async (id: string, url: string) => {
    const { data } = await api.post(`/produtos/${id}/fetch-image`, { url });
    return data;
  },
};

// ─── Vendas ──────────────────────────────
export const vendasService = {
  listar: async (): Promise<Venda[]> => {
    const { data } = await api.get("/vendas");
    return data;
  },
  obter: async (id: string): Promise<Venda> => {
    const { data } = await api.get(`/vendas/${id}`);
    return data;
  },
  criar: async (venda: {
    compradorNome: string;
    compradorEmail?: string;
    compradorTelefone?: string;
    paymentMethod?: "dinheiro" | "cartao" | "transferencia";
    dataVenda?: string;
    observacoes?: string;
    itens: { produtoId: string; quantidade: number; precoUnitario: number }[];
  }): Promise<Venda> => {
    const { data } = await api.post("/vendas", venda);
    return data;
  },
};

// ─── Movimentos ──────────────────────────
export const movimentosService = {
  listar: async (): Promise<Movimento[]> => {
    const { data } = await api.get("/movimentos");
    return data;
  },
  porProduto: async (produtoId: string): Promise<Movimento[]> => {
    const { data } = await api.get(`/movimentos/produto/${produtoId}`);
    return data;
  },
  criar: async (movimento: {
    produtoId: string;
    tipo: "entrada" | "ajuste" | "devolucao";
    quantidade: number;
    motivo?: string;
  }): Promise<Movimento> => {
    const { data } = await api.post("/movimentos", movimento);
    return data;
  },
};

// ─── Finanças ────────────────────────────
export const financeService = {
  resumo: async (params?: { startDate?: string; endDate?: string }) => {
    const { data } = await api.get("/finance/resumo", { params });
    return data as { receitas: number; despesas: number; lucro: number; caixaAtual: number };
  },
  topProducts: async () => {
    const { data } = await api.get("/finance/top-products");
    return data as { produtoId: string; nome: string; quantidade: number }[];
  },
};