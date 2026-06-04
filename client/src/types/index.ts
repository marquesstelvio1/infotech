export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  role: "admin" | "atendente";
  telefone?: string;
  ativo: boolean;
  createdAt: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  estado: "disponivel" | "indisponivel" | "vendido" | "reservado";
  stock: number;
  precoCompra?: string | number;
  precoVenda: string | number;
  qrCode: string;
  observacoes?: string;
  createdAt: string;
}

export interface ItemVenda {
  id: string;
  vendaId: string;
  produtoId: string;
  produto?: Produto;
  quantidade: number;
  precoUnitario: string;
  subtotal: string;
}

export interface Venda {
  id: string;
  atendenteId?: string;
  atendente?: { id: string; nome: string };
  compradorNome: string;
  compradorEmail?: string;
  compradorTelefone?: string;
  totalVenda: string;
  dataVenda: string;
  observacoes?: string;
  paymentMethod?: "dinheiro" | "cartao" | "transferencia";
  itensVenda?: ItemVenda[];
  createdAt: string;
}

export interface Movimento {
  id: string;
  produtoId: string;
  produto?: { id: string; nome: string };
  utilizadorId?: string;
  utilizador?: { id: string; nome: string };
  vendaId?: string;
  tipo: "entrada" | "saida" | "ajuste" | "devolucao";
  quantidade: number;
  stockAntes: number;
  stockDepois: number;
  motivo?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  utilizador: Omit<Utilizador, "ativo" | "createdAt">;
}

export interface ApiErro {
  erro: string;
}
