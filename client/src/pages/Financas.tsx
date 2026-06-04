import { useEffect, useState } from "react";
import { financeService } from "../services";
import { useAuth } from "../contexts/authcontexts";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { vendasService, movimentosService } from "../services";
import { DollarSign, FileText, Download, TrendingUp } from "lucide-react";
import api from "../services/api";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ProductCard from "../components/ProductCard";

export default function Financas() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<{ receitas: number; despesas: number; lucro: number; caixaAtual: number } | null>(null);
  const [top, setTop] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [intervalDays, setIntervalDays] = useState<number>(30);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    financeService.resumo().then(setResumo).catch(console.error);
    financeService.topProducts().then(setTop).catch(console.error);
    vendasService.listar().then(setVendas).catch(console.error);
    movimentosService.listar().then(setMovimentos).catch(console.error);
  }, [isAdmin]);

  if (!resumo) return <p className="text-slate-300">A carregar resumo financeiro...</p>;

  // Build time series for last N days
  const buildSeries = () => {
    const days = intervalDays;
    const today = new Date();
    const series: { date: string; receitas: number; despesas: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      series.push({ date: key, receitas: 0, despesas: 0 });
    }

    vendas.forEach((v) => {
      const key = new Date(v.dataVenda).toISOString().split("T")[0];
      const s = series.find((x) => x.date === key);
      if (s) s.receitas += Number(v.totalVenda);
    });

    // despesas: movimentos tipo 'ajuste' sem venda e quantidade negativa => cost = precoCompra * abs(qtd)
    movimentos.forEach((m) => {
      if (m.tipo !== "ajuste") return;
      if (m.vendaId) return;
      if (Number(m.quantidade) >= 0) return;
      const key = new Date(m.createdAt).toISOString().split("T")[0];
      const s = series.find((x) => x.date === key);
      const precoCompra = m.produto?.precoCompra ? Number(m.produto.precoCompra) : 0;
      const custo = precoCompra * Math.abs(Number(m.quantidade));
      if (s) s.despesas += custo;
    });

    return series;
  };

  const chartData = buildSeries();

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    const isDeficit = (payload.despesas ?? 0) > (payload.receitas ?? 0);
    const color = isDeficit ? "#ef4444" : "#3b82f6";
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#111827" strokeWidth={1} />;
  };
  const exportCSV = () => {
    const rows = [
      ["Métrica", "Valor"],
      ["Receitas", resumo.receitas.toFixed(2)],
      ["Despesas", resumo.despesas.toFixed(2)],
      ["Lucro", resumo.lucro.toFixed(2)],
      ["CaixaAtual", resumo.caixaAtual.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumo_financeiro.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
        const response = await api.get('/finance/export-pdf', { responseType: 'blob' });
        const blob = response.data;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financas-${new Date().toISOString().slice(0,10)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar PDF');
    }
  };

    const exportPDFVisual = async () => {
      try {
        const el = document.getElementById('finance-report');
        if (!el) throw new Error('Elemento do relatório não encontrado');
        const canvas = await html2canvas(el, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        // scale image to fit width
        const imgProps = (pdf as any).getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`financas-visual-${new Date().toISOString().slice(0,10)}.pdf`);
      } catch (err) {
        console.error(err);
        alert('Erro ao gerar PDF visual');
      }
    };

  return (
    <div id="finance-report" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3"><DollarSign size={20} /> Finanças</h2>
          <p className="text-gray-400 text-sm mt-1">Resumo financeiro e top produtos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="bg-gray-800 text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={() => window.print()} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2">
            <FileText size={14} /> Imprimir
          </button>
          <button onClick={exportPDF} className="bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2">
            <FileText size={14} /> Exportar PDF (dados)
          </button>
          <button onClick={exportPDFVisual} className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500 flex items-center gap-2">
            <FileText size={14} /> Exportar PDF (visual)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-700 to-green-500 rounded-2xl p-5 text-white">
          <p className="text-sm uppercase">Receitas</p>
          <p className="text-2xl font-bold">{resumo.receitas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz</p>
          <p className="text-xs mt-1 flex items-center gap-1"><TrendingUp size={12} /> Valor total no período</p>
        </div>

        <div className="bg-gradient-to-br from-red-700 to-red-500 rounded-2xl p-5 text-white">
          <p className="text-sm uppercase">Despesas</p>
          <p className="text-2xl font-bold">{resumo.despesas.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz</p>
          <p className="text-xs mt-1">Categorias e fornecedores</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-5 text-white">
          <p className="text-sm uppercase">Lucro</p>
          <p className="text-2xl font-bold">{resumo.lucro.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz</p>
          <p className="text-xs mt-1">Receitas - Despesas</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-5 text-white">
          <p className="text-sm uppercase">Caixa Atual</p>
          <p className="text-2xl font-bold">{resumo.caixaAtual.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz</p>
          <p className="text-xs mt-1">Saldo disponível</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Receitas vs Despesas</h3>
        <div className="h-64">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setIntervalDays(d)} className={`px-3 py-1 rounded ${intervalDays===d? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                  {d} dias
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-400">Intervalo: últimos {intervalDays} dias</div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <Tooltip formatter={(value) => `${Number(value ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2 })} Kz`} />
              <Legend />
              <Area type="monotone" dataKey="receitas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRec)" dot={CustomDot} />
              <Area type="monotone" dataKey="despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorDesp)" dot={{ stroke: '#ef4444', strokeWidth: 2 }} />
              {/* custom dots to highlight deficit days */}
              {/* We'll overlay a transparent scatter via customized dots inside Area by using dot prop as a function on the receitas area */}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Top 5 Produtos Mais Vendidos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {top.length === 0 && (
            <div className="col-span-full text-center text-gray-500 py-6">Sem dados.</div>
          )}
          {top.map((p: any) => (
            <ProductCard key={p.produtoId} id={p.produtoId} nome={p.nome} quantidadeVendida={p.quantidade} />
          ))}
        </div>
      </div>
    </div>
  );
}
