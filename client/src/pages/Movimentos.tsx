import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { movimentosService } from "../services";
import type { Movimento } from "../types";

export default function Movimentos() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = async () => {
    try {
      setError(null);
      const m = await movimentosService.listar();
      setMovimentos(m);
    } catch (err) {
      console.error("Erro ao carregar movimentos:", err);
      setMovimentos([]);
      setError("Não foi possível carregar os movimentos. Verifique a ligação ou faça login novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-PT");

  const exportToCSV = () => {
    const headers = ["Produto", "Tipo", "Qtd", "Stock Antes", "Stock Depois", "Motivo", "Data", "Responsável"];
    const rows = movimentos.map((m) => [
      m.produto?.nome ?? "",
      m.tipo,
      m.quantidade > 0 ? `+${m.quantidade}` : `${m.quantidade}`,
      `${m.stockAntes}`,
      `${m.stockDepois}`,
      m.motivo ?? "",
      formatDate(m.createdAt),
      m.utilizador?.nome ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Movimentos de Stock", 14, 14);
    const columns = ["Produto", "Tipo", "Qtd", "Stock Antes", "Stock Depois", "Motivo", "Data", "Responsável"];
    const rows = movimentos.map((m) => [
      m.produto?.nome ?? "",
      m.tipo,
      m.quantidade > 0 ? `+${m.quantidade}` : `${m.quantidade}`,
      `${m.stockAntes}`,
      `${m.stockDepois}`,
      m.motivo ?? "",
      formatDate(m.createdAt),
      m.utilizador?.nome ?? "",
    ]);
    (doc as any).autoTable({
      startY: 20,
      head: [columns],
      body: rows,
      styles: { fontSize: 10, textColor: 20 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });
    doc.save(`movimentos-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const corTipo = (tipo: string) => {
    if (tipo === "entrada" || tipo === "devolucao") return "bg-green-100 text-green-700";
    if (tipo === "saida") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  if (loading) return <p className="text-gray-500">A carregar...</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Movimentos de Stock</h2>
          <p className="mt-2 text-sm text-slate-400">Os movimentos são gerados automaticamente quando há cadastro, edição, deleção ou venda de produto. Não se registam manualmente nesta página.</p>
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={exportToCSV} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition">Salvar CSV</button>
          <button onClick={exportToPDF} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Salvar PDF</button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Qtd</th>
              <th className="px-4 py-3">Stock Antes</th>
              <th className="px-4 py-3">Stock Depois</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {movimentos.map((m) => (
              <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800">
                <td className="px-4 py-3 font-medium text-slate-100">{m.produto?.nome ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${corTipo(m.tipo)}`}>{m.tipo}</span>
                </td>
                <td className="px-4 py-3 text-slate-200">{m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}</td>
                <td className="px-4 py-3 text-slate-200">{m.stockAntes}</td>
                <td className="px-4 py-3 text-slate-200">{m.stockDepois}</td>
                <td className="px-4 py-3 text-slate-400">{m.motivo ?? "—"}</td>
                <td className="px-4 py-3 text-slate-200">{m.utilizador?.nome ?? "—"}</td>
                <td className="px-4 py-3 text-slate-200">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
            {movimentos.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Nenhum movimento registado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}