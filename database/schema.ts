// ============================================================
//  GSI INFOTECH — Drizzle ORM Schema (PostgreSQL / Supabase)
//  Tabelas: utilizadores, produtos, vendas, itensVenda, movimentos
// ============================================================

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  decimal,
  integer,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

export const roleUtilizadorEnum = pgEnum("role_utilizador", [
  "admin",
  "desenvolvedor",
  "atendente",
]);

export const estadoProdutoEnum = pgEnum("estado_produto", [
  "disponivel",
  "indisponivel",
  "vendido",
  "reservado",
]);

export const categoriaProdutoEnum = pgEnum("categoria_produto", [
  "computador_desktop",
  "laptop",
  "monitor",
  "impressora",
  "servidor",
  "switch_rede",
  "router",
  "tablet",
  "smartphone",
  "periferico",
  "outro",
]);

export const tipoMovimentoEnum = pgEnum("tipo_movimento", [
  "entrada",   // compra/reposição de stock
  "saida",     // venda
  "ajuste",    // correção manual de stock
  "devolucao", // devolução de cliente
]);

// ─────────────────────────────────────────
// TABELA: utilizadores
// ─────────────────────────────────────────

export const utilizadores = pgTable("utilizadores", {
  id:           uuid("id").primaryKey().defaultRandom(),
  nome:         varchar("nome", { length: 150 }).notNull(),
  email:        varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role:         roleUtilizadorEnum("role").notNull().default("atendente"),
  telefone:     varchar("telefone", { length: 20 }),
  ativo:        boolean("ativo").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────
// TABELA: produtos
// ─────────────────────────────────────────

export const produtos = pgTable("produtos", {
  id:           uuid("id").primaryKey().defaultRandom(),
  nome:         varchar("nome", { length: 200 }).notNull(),
  categoria:    categoriaProdutoEnum("categoria").notNull(),
  marca:        varchar("marca", { length: 100 }),
  modelo:       varchar("modelo", { length: 150 }),
  numeroSerie:  varchar("numero_serie", { length: 200 }).unique(),
  estado:       estadoProdutoEnum("estado").notNull().default("disponivel"),
  stock:        integer("stock").notNull().default(0),
  precoCompra:  decimal("preco_compra", { precision: 10, scale: 2 }),
  precoVenda:   decimal("preco_venda", { precision: 10, scale: 2 }).notNull(),
  observacoes:  text("observacoes"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
  qrCode: uuid("qr_code").notNull().unique().defaultRandom()
}, (table) => ({
  stockNonNegative: check("stock_non_negative", sql`${table.stock} >= 0`),
}));

// ─────────────────────────────────────────
// TABELA: vendas
// ─────────────────────────────────────────

export const vendas = pgTable("vendas", {
  id:                uuid("id").primaryKey().defaultRandom(),
  atendenteId:        uuid("atendente_id").references(() => utilizadores.id),

  compradorNome:     varchar("comprador_nome", { length: 200 }).notNull(),
  compradorEmail:    varchar("comprador_email", { length: 255 }),
  compradorTelefone: varchar("comprador_telefone", { length: 20 }),
  paymentMethod:     varchar("payment_method", { length: 50 }),

  totalVenda:        decimal("total_venda", { precision: 10, scale: 2 }).notNull(),
  dataVenda:         date("data_venda").notNull(),
  observacoes:       text("observacoes"),

  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────
// TABELA: itens_venda
// (cada linha de produto dentro de uma venda)
// ─────────────────────────────────────────

export const itensVenda = pgTable("itens_venda", {
  id:            uuid("id").primaryKey().defaultRandom(),
  vendaId:       uuid("venda_id").notNull().references(() => vendas.id, { onDelete: "cascade" }),
  produtoId:     uuid("produto_id").notNull().references(() => produtos.id),

  quantidade:    integer("quantidade").notNull().default(1),
  precoUnitario: decimal("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal:      decimal("subtotal", { precision: 10, scale: 2 }).notNull(),

  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────
// TABELA: movimentos
// (histórico de entradas/saídas de stock)
// ─────────────────────────────────────────

export const movimentos = pgTable("movimentos", {
  id:            uuid("id").primaryKey().defaultRandom(),
  produtoId:     uuid("produto_id").notNull().references(() => produtos.id),
  utilizadorId:  uuid("utilizador_id").references(() => utilizadores.id),
  vendaId:       uuid("venda_id").references(() => vendas.id), // preenchido se for saída por venda

  tipo:          tipoMovimentoEnum("tipo").notNull(),
  quantidade:    integer("quantidade").notNull(),              // positivo = entrada, negativo = saída
  stockAntes:    integer("stock_antes").notNull(),
  stockDepois:   integer("stock_depois").notNull(),
  motivo:        text("motivo"),

  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────
// RELACIONAMENTOS
// ─────────────────────────────────────────

export const utilizadoresRelations = relations(utilizadores, ({ many }) => ({
  vendas:      many(vendas),
  movimentos:  many(movimentos),
}));

export const produtosRelations = relations(produtos, ({ many }) => ({
  itensVenda:  many(itensVenda),
  movimentos:  many(movimentos),
}));
export const vendasRelations = relations(vendas, ({ one, many }) => ({
  atendente:  one(utilizadores, { fields: [vendas.atendenteId], references: [utilizadores.id] }),
  itensVenda: many(itensVenda),
  movimentos: many(movimentos),
}));

export const itensVendaRelations = relations(itensVenda, ({ one }) => ({
  venda:   one(vendas,   { fields: [itensVenda.vendaId],   references: [vendas.id] }),
  produto: one(produtos, { fields: [itensVenda.produtoId], references: [produtos.id] }),
}));

export const movimentosRelations = relations(movimentos, ({ one }) => ({
  produto:     one(produtos,     { fields: [movimentos.produtoId],    references: [produtos.id] }),
  utilizador:  one(utilizadores, { fields: [movimentos.utilizadorId], references: [utilizadores.id] }),
  venda:       one(vendas,       { fields: [movimentos.vendaId],      references: [vendas.id] }),
}));

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type Utilizador      = typeof utilizadores.$inferSelect;
export type NovoUtilizador  = typeof utilizadores.$inferInsert;

export type Produto         = typeof produtos.$inferSelect;
export type NovoProduto     = typeof produtos.$inferInsert;

export type Venda           = typeof vendas.$inferSelect;
export type NovaVenda       = typeof vendas.$inferInsert;

export type ItemVenda       = typeof itensVenda.$inferSelect;
export type NovoItemVenda   = typeof itensVenda.$inferInsert;

export type Movimento       = typeof movimentos.$inferSelect;
export type NovoMovimento   = typeof movimentos.$inferInsert;
