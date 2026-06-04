import { useEffect, useState } from "react";
import { produtosService, vendasService } from "../services";
import type { Produto, Venda } from "../types";
import { useAuth } from "../contexts/authcontexts";
import { useNavigate } from "react-router-dom";

export default function DashboardAtendente() {
  const { utilizador } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([produtosService.listar(), vendasService.listar()]).then(([p, v]) => {
      setProdutos(p);
      setVendas(v);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">Visão simplificada para atendentes</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Produtos</p>
          <p className="text-4xl font-bold text-white">{produtos.length.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Vendas</p>
          <p className="text-4xl font-bold text-white">{vendas.length}</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Ações rápidas</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate('/vendas/novo')} className="bg-blue-600 px-3 py-2 rounded text-white">Nova Venda</button>
            <button onClick={() => navigate('/produtos')} className="bg-gray-700 px-3 py-2 rounded text-white">Ver Produtos</button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Últimas Vendas</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700">
              <th className="pb-3 text-left">Comprador</th>
              <th className="pb-3 text-left">Data</th>
              <th className="pb-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {vendas.slice(0,5).map(v => (
              <tr key={v.id} className="hover:bg-gray-750">
                <td className="py-3 text-white font-medium">{v.compradorNome}</td>
                <td className="py-3 text-gray-400">{new Date(v.dataVenda).toLocaleDateString('pt-PT')}</td>
                <td className="py-3 text-blue-400 font-semibold text-right">{Number(v.totalVenda).toLocaleString('pt-PT')} Kz</td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-gray-500">Nenhuma venda registada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
