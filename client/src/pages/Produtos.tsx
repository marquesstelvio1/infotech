import { useEffect, useState } from "react";
import { produtosService, movimentosService } from "../services";
import { useAuth } from "../contexts/authcontexts";
import type { Produto } from "../types";
import ProductCard from "../components/ProductCard";

const CATEGORIAS = [
  "computador_desktop","laptop","monitor","impressora","servidor",
  "switch_rede","router","tablet","smartphone","periferico","outro",
];

export default function Produtos() {
  const { isAdmin } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Produto>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageLink, setImageLink] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const serverBase = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/api\/?$/, "");

  const carregar = async () => {
    try {
      setLoading(true);
      const data = await produtosService.listar();
      setProdutos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const abrirCriar = () => {
    setForm({});
    setEditId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageLink("");
    setImageError(null);
    setError(null);
    setModalOpen(true);
  };

  const abrirRelatorioGeral = () => {
    setReportOpen(true);
  };

  const gerarRelatorioGeral = async () => {
    try {
      const headers = ['id','nome','categoria','marca','stock','precoVenda'];
      const rows = produtos.map((p) => [p.id, p.nome, p.categoria ?? '', p.marca ?? '', String(p.stock ?? ''), String(p.precoVenda ?? '')]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_stock_geral.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar o relatório geral.');
    }
  };

  const abrirQr = (p: Produto) => {
    const url = `${window.location.origin}/produtos/${p.id}`;
    setQrValue(url);
    setQrId(p.id);
    setQrTitle(p.nome ?? null);
    setQrOpen(true);
  };

  const fecharQr = () => {
    setQrOpen(false);
    setQrValue(null);
    setQrId(null);
    setQrTitle(null);
  };

  const salvarQr = () => {
    if (!qrValue) return;
    const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `qr_${qrId ?? 'produto'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const gerarRelatorioProduto = async (produtoId: string) => {
    try {
      const movimentos = await movimentosService.porProduto(produtoId);
      // build CSV
      const headers = ['data','tipo','quantidade','motivo'];
      const rows = movimentos.map((m: any) => [m.dataMovimento || m.createdAt || '', m.tipo || '', String(m.quantidade || ''), m.motivo || '']);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_produto_${produtoId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Falha ao gerar o relatório do produto.');
    }
  };

  const abrirEditar = (p: Produto) => {
    setForm(p);
    setEditId(p.id);
    setSelectedFile(null);
    setPreviewUrl(`${serverBase}/assets/products/${p.id}.jpg?v=${Date.now()}`);
    setImageLink("");
    setImageError(null);
    setError(null);
    setModalOpen(true);
  };

  function normalizeImageLink(url: string) {
    try {
      if (!url) return "";
      const trimmed = url.trim();
      const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const u = new URL(withScheme);
      const media = u.searchParams.get("mediaurl") || u.searchParams.get("imgurl");
      if (media) return decodeURIComponent(media);
      return withScheme;
    } catch (err) {
      const match = url.match(/mediaurl=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
      return url.trim();
    }
  }

  const aplicarLinkImediato = async () => {
    const normalized = normalizeImageLink(imageLink || "");
    setPreviewUrl(normalized || null);
    setSelectedFile(null);
    setImageError(null);

    if (editId && normalized) {
      try {
        await produtosService.fetchImage(editId, normalized);
        await carregar();
        setImageVersions((m) => ({ ...m, [editId]: Date.now() }));
        setPreviewUrl(`${serverBase}/assets/products/${editId}.jpg?v=${Date.now()}`);
      } catch (err) {
        console.error(err);
        setImageError("Falha ao obter a imagem no servidor. Verifique o URL ou tente outro link.");
      }
    }
  };

  const guardar = async () => {
    setError(null);
    const stockValue = Number(form.stock ?? 0);
    const precoVendaValue = Number(form.precoVenda ?? 0);

    if (!form.nome || !form.categoria || !form.precoVenda) {
      setError("Nome, categoria e preço de venda são obrigatórios.");
      return;
    }
    if (stockValue < 0) { setError("O stock não pode ser negativo."); return; }
    if (stockValue > precoVendaValue) { setError("O stock não pode ultrapassar o preço de venda."); return; }

    const payload = {
      nome: form.nome,
      categoria: form.categoria,
      marca: form.marca,
      modelo: form.modelo,
      numeroSerie: form.numeroSerie,
      stock: stockValue,
      precoCompra: form.precoCompra,
      precoVenda: precoVendaValue,
      estado: stockValue <= 0 ? "indisponivel" : form.estado === "indisponivel" ? "disponivel" : form.estado,
    } as Partial<Produto>;

    try {
      let saved: Produto | null = null;
      if (editId) saved = await produtosService.atualizar(editId, payload);
      else saved = await produtosService.criar(payload);

      if (selectedFile && saved) {
        await produtosService.uploadImage(saved.id, selectedFile);
        await carregar();
        setImageVersions((m) => ({ ...m, [saved.id]: Date.now() }));
      } else if (!selectedFile && imageLink && saved) {
        const urlToFetch = normalizeImageLink(imageLink);
        try {
          await produtosService.fetchImage(saved.id, urlToFetch);
          await carregar();
          setImageVersions((m) => ({ ...m, [saved.id]: Date.now() }));
        } catch (err) {
          console.error(err);
          setImageError("Falha ao obter a imagem no servidor. Verifique o URL ou tente outro link.");
          return;
        }
      }

      setModalOpen(false);
      setSelectedFile(null);
      setImageLink("");
      setPreviewUrl(null);
      await carregar();
    } catch (err) {
      console.error(err);
      setError("Falha ao guardar o produto.");
    }
  };

  if (loading) return <p className="text-gray-500">A carregar...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Produtos</h2>
        <div className="flex items-center gap-2">
          {isAdmin && <button onClick={abrirCriar} className="px-3 py-2 bg-blue-600 rounded text-white">+ Novo Produto</button>}
          <button onClick={abrirRelatorioGeral} className="px-3 py-2 bg-amber-500 rounded text-slate-900">Relatório</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {produtos.map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            nome={p.nome}
            categoria={p.categoria}
            marca={p.marca}
            stock={p.stock}
            precoVenda={p.precoVenda}
            imageVersion={imageVersions[p.id] || 0}
            onEdit={isAdmin ? () => abrirEditar(p) : undefined}
            onDelete={isAdmin ? () => { if (confirm('Eliminar?')) { produtosService.eliminar(p.id).then(() => carregar()); } } : undefined}
            onOpenQr={() => abrirQr(p)}
          />
        ))}
      </div>

      {qrOpen && qrValue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-slate-950 text-slate-100 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-800">
            <button onClick={fecharQr} className="absolute top-4 right-4 text-slate-300">Fechar</button>
            <h4 className="text-xl font-semibold">QR Code{qrTitle ? ` - ${qrTitle}` : ''}</h4>
            <div className="text-sm text-slate-400 mb-4">Use este QR para testes do produto.</div>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white rounded-xl p-4 shadow-lg">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrValue)}`} alt="qr" className="block w-56 h-56 object-contain" />
              </div>

              <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-full w-full max-w-sm text-center font-mono truncate">{qrId}</div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={salvarQr} className="px-4 py-2 bg-cyan-600 text-white rounded">Salvar</button>
              <button onClick={fecharQr} className="px-4 py-2 rounded border">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 w-full max-w-2xl shadow-xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Relatório Geral de Stock</h4>
              <div className="flex gap-2">
                <button onClick={gerarRelatorioGeral} className="px-3 py-2 bg-blue-600 text-white rounded">Descarregar CSV</button>
                <button onClick={() => setReportOpen(false)} className="px-3 py-2 rounded border">Fechar</button>
              </div>
            </div>

            <div className="overflow-auto max-h-96">
              <table className="min-w-full text-left table-auto">
                <thead>
                  <tr className="text-sm text-slate-300">
                    <th className="px-2 py-1">Nome</th>
                    <th className="px-2 py-1">Categoria</th>
                    <th className="px-2 py-1">Marca</th>
                    <th className="px-2 py-1">Stock</th>
                    <th className="px-2 py-1 text-right">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => (
                    <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-900">
                      <td className="px-2 py-1 text-slate-100">{p.nome}</td>
                      <td className="px-2 py-1 text-slate-300 capitalize">{p.categoria?.replace('_',' ')}</td>
                      <td className="px-2 py-1 text-slate-300">{p.marca ?? '—'}</td>
                      <td className="px-2 py-1 text-emerald-300">{p.stock ?? '—'}</td>
                      <td className="px-2 py-1 text-right text-white">{p.precoVenda ? Number(p.precoVenda).toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-950 text-slate-100 rounded-2xl p-4 w-full max-w-md shadow-xl border border-slate-800">
            <h3 className="text-lg font-bold mb-3">{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
            {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Nome *</label>
                <input placeholder="Nome *" value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Categoria</label>
                <select value={form.categoria ?? ''} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700">
                  <option value="">Categoria *</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-sm">Marca</label>
                  <input placeholder="Marca" value={form.marca ?? ''} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-sm">Modelo</label>
                  <input placeholder="Modelo" value={form.modelo ?? ''} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-sm">Stock</label>
                  <input type="number" min={0} placeholder="Stock" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700" />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-sm">Preço Venda</label>
                  <input type="number" placeholder="Preço Venda *" value={form.precoVenda ?? ''} onChange={(e) => setForm({ ...form, precoVenda: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700 text-right" />
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-sm">Imagem (link opcional)</label>
                  <input value={imageLink} onChange={(e) => { setImageLink(e.target.value); setPreviewUrl(e.target.value ? normalizeImageLink(e.target.value) : null); }} onBlur={() => { if (imageLink && editId) aplicarLinkImediato(); }} placeholder="https://..." className="w-full bg-slate-900 text-slate-100 px-2 py-2 rounded border border-slate-700" />
                  {imageError && <div className="text-xs text-red-400">{imageError}</div>}
                </div>

                <div className="w-28 h-28 border border-slate-700 rounded overflow-hidden flex-shrink-0">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} className="w-full h-full object-cover" alt="preview" onError={() => { setImageError('Falha ao carregar a imagem.'); setPreviewUrl(null); }} />
                  ) : (
                    <div className="w-full h-full bg-slate-800" />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setModalOpen(false)} className="px-3 py-2 rounded border">Cancelar</button>
                <button onClick={guardar} className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
