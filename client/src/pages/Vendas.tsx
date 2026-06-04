import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { vendasService } from "../services";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Venda } from "../types";


export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const v = await vendasService.listar();
    setVendas(v);
    setLoading(false);
  };

  const gerarFatura = async (id: string) => {
    try {
      const venda = await vendasService.obter(id);
      const doc = new jsPDF({ unit: 'pt' });

      doc.setFontSize(16);
      doc.text('Fatura de Venda', 40, 40);
      doc.setFontSize(10);
      doc.text(`Fatura: ${venda.id}`, 40, 60);
      doc.text(`Data: ${new Date(venda.dataVenda).toLocaleString('pt-PT')}`, 40, 75);
      doc.text(`Comprador: ${venda.compradorNome}`, 40, 90);
      if (venda.compradorEmail) doc.text(`Email: ${venda.compradorEmail}`, 40, 105);
      if (venda.compradorTelefone) doc.text(`Telefone: ${venda.compradorTelefone}`, 40, 120);

      const items = (venda.itensVenda || []).map((it) => [
        it.produto?.nome ?? it.produtoId,
        String(it.quantidade),
        Number(it.precoUnitario).toFixed(2),
        Number(it.subtotal ?? (it.quantidade * Number(it.precoUnitario))).toFixed(2),
      ]);

      autoTable(doc as any, {
        head: [['Produto', 'Qtd', 'Preço Unit.', 'Subtotal']],
        body: items,
        startY: 140,
        styles: { fontSize: 10 },
      });

      const finalY = (doc as any).lastAutoTable?.finalY ?? 140;
      doc.setFontSize(11);
      doc.text(`Total: ${Number(venda.totalVenda).toFixed(2)} Kz`, 40, finalY + 30);
      doc.text(`Pagamento: ${venda.paymentMethod ?? '—'}`, 40, finalY + 45);
      doc.text(`Atendente: ${venda.atendente?.nome ?? '—'}`, 40, finalY + 60);

      doc.save(`fatura-${venda.id}.pdf`);
    } catch (err) {
      console.error('Falha ao gerar fatura', err);
      alert('Falha ao gerar fatura. Veja o console para detalhes.');
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  if (loading) return <p className="text-slate-300">A carregar...</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Vendas</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to="/vendas/novo" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            + Nova Venda
          </Link>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Atendendor</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v) => (
              <tr key={v.id} className="border-t border-slate-800 hover:bg-slate-800">
                <td className="px-4 py-3 font-medium text-slate-100">{v.compradorNome}</td>
                <td className="px-4 py-3 text-slate-300">{new Date(v.dataVenda).toLocaleDateString("pt-PT")}</td>
                <td className="px-4 py-3 text-slate-300">{v.itensVenda?.reduce((sum, item) => sum + item.quantidade, 0) ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300 capitalize">{v.paymentMethod ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-100 text-right">{Number(v.totalVenda).toFixed(2)} Kz</td>
                <td className="px-4 py-3 text-slate-300">{v.atendente?.nome ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => gerarFatura(v.id)} className="text-cyan-400 hover:underline text-sm">Fatura</button>
                </td>
              </tr>
            ))}
            {vendas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Nenhuma venda registada.</td></tr>
            )}
          </tbody>
        </table>
      </div>


    </div>
  );
}
