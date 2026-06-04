import { useEffect, useState } from "react";
import { produtosService, vendasService, movimentosService } from "../services";
import type { Produto, Venda, Movimento } from "../types";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { useAuth } from "../contexts/authcontexts";
import { useNavigate } from "react-router-dom";

const COLORS = ["#3b82f6", "#1e40af", "#60a5fa"];

export default function Dashboard() {
  const { utilizador } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      produtosService.listar(),
      vendasService.listar(),
      movimentosService.listar(),
    ]).then(([p, v, m]) => {
      setProdutos(p);
      setVendas(v);
      setMovimentos(m);
      setLoading(false);
    });
  }, []);

  const totalVendas = vendas.reduce((acc, v) => acc + Number(v.totalVenda), 0);
  const totalStockProdutos = produtos.reduce((acc, p) => acc + Number(p.stock), 0);
  const vendidosQuantidade = vendas.reduce((acc, v) => {
    const itens = v.itensVenda?.reduce((sum, item) => sum + Number(item.quantidade), 0) ?? 0;
    return acc + itens;
  }, 0);
  const naoVendidosQuantidade = produtos
    .filter((p) => p.estado !== "vendido")
    .reduce((acc, p) => acc + Number(p.stock), 0);

  // Dados por categoria para gráfico de barras
  const categorias = produtos.reduce((acc: Record<string, number>, p) => {
    const cat = p.categoria.replace("_", " ");
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});
  const barData = Object.entries(categorias).map(([name, value]) => ({ name, value }));

  // Dados donut
  const donutData = [
    { name: "Stock", value: totalStockProdutos },
    { name: "Vendidos", value: vendidosQuantidade },
    { name: "Não Vendidos", value: naoVendidosQuantidade },
  ];

  // Dados de vendas por dia para line chart
  const vendasPorDia = vendas.reduce((acc: Record<string, number>, v) => {
    const dia = new Date(v.dataVenda).getDate().toString();
    acc[dia] = (acc[dia] ?? 0) + 1;
    return acc;
  }, {});
  const lineData = Object.entries(vendasPorDia).map(([day, count]) => ({ day, count }));

  // Receita por dia
  const receitaPorDia = vendas.reduce((acc: Record<string, number>, v) => {
    const dia = new Date(v.dataVenda).getDate().toString();
    acc[dia] = (acc[dia] ?? 0) + Number(v.totalVenda);
    return acc;
  }, {});
  const receitaData = Object.entries(receitaPorDia).map(([day, total]) => ({ day, total }));

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Visão geral do inventário e operações</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-xl">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {utilizador?.nome?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{utilizador?.nome}</p>
            <p className="text-gray-400 text-xs capitalize">{utilizador?.role}</p>
          </div>
        </div>
      </div>

      {/* Linha de cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Total Produtos + BarChart */}
        <div className="bg-gray-800 rounded-2xl p-5 col-span-1 md:col-span-1">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Produtos</p>
          <p className="text-4xl font-bold text-white">{produtos.length.toLocaleString()}</p>
          <p className="text-green-400 text-xs mt-1">↑ up-trend</p>
          <div className="mt-4 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.slice(0, 6)} barSize={10}>
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estoque + Donut */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total em Stock</p>
          <p className="text-4xl font-bold text-white">{totalStockProdutos}</p>
          <div className="mt-2 h-28 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={52} dataKey="value" stroke="none">
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 mt-1">
            {donutData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-gray-400 text-xs">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Vendas + LineChart */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Vendas</p>
          <p className="text-4xl font-bold text-white">{vendas.length}</p>
          <p className="text-orange-400 text-lg mt-1">🔥</p>
          <div className="mt-2 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Receita Total + LineChart */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Receita Total</p>
          <p className="text-2xl font-bold text-white">{totalVendas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz</p>
          <div className="mt-4 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={receitaData}>
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#fff", fontSize: 11 }}
                />
                <Line type="monotone" dataKey="total" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {utilizador?.role === "admin" && (
          <div className="bg-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Admin</p>
            <p className="text-2xl font-bold text-white">Painel Finanças</p>
            <p className="text-gray-400 text-sm mt-2">Ver resumo financeiro e relatórios</p>
            <div className="mt-4">
              <button onClick={() => navigate('/financas')} className="bg-blue-600 px-3 py-2 rounded text-white">Abrir Finanças</button>
            </div>
          </div>
        )}
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Últimas Vendas */}
        <div className="bg-gray-800 rounded-2xl p-5 xl:col-span-2">
          <h3 className="text-white font-semibold mb-4">Últimas Vendas</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700">
                <th className="pb-3 text-left">Comprador</th>
                <th className="pb-3 text-left">Data</th>
                <th className="pb-3 text-left">Itens</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {vendas.slice(0, 5).map((v) => (
                <tr key={v.id} className="hover:bg-gray-750">
                  <td className="py-3 text-white font-medium">{v.compradorNome}</td>
                  <td className="py-3 text-gray-400">{new Date(v.dataVenda).toLocaleDateString("pt-PT")}</td>
                  <td className="py-3 text-gray-400">{v.itensVenda?.reduce((sum, item) => sum + item.quantidade, 0) ?? "—"}</td>
                  <td className="py-3 text-blue-400 font-semibold text-right">{Number(v.totalVenda).toLocaleString("pt-PT")} Kz</td>
                </tr>
              ))}
              {vendas.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhuma venda registada.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Últimos Movimentos */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Últimos Movimentos</h3>
          <div className="space-y-3">
            {movimentos.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.utilizador?.nome?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">
                    {m.tipo === "saida" ? "Produto vendido" : m.tipo === "entrada" ? "Stock actualizado" : "Ajuste"} — {m.produto?.nome}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(m.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-xs font-bold shrink-0 ${m.quantidade > 0 ? "text-green-400" : "text-red-400"}`}>
                  {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                </span>
              </div>
            ))}
            {movimentos.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Nenhum movimento.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}