import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner/qr-scanner.min.js";
import workerPath from "qr-scanner/qr-scanner-worker.min.js?url";
import { vendasService, produtosService } from "../services";
import type { Produto } from "../types";

QrScanner.WORKER_PATH = workerPath;

interface ItemForm {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}

type PaymentMethod = "dinheiro" | "cartao" | "transferencia";

export default function NovaVenda() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    compradorNome: "",
    observacoes: "",
    paymentMethod: "dinheiro" as PaymentMethod,
  });
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [scannerStatus, setScannerStatus] = useState("A carregar câmara...");
  const [scanError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<any | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const carregarProdutos = async () => {
      try {
        const lista = await produtosService.listar();
        setProdutos(lista);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os produtos.");
      } finally {
        setLoading(false);
      }
    };

    carregarProdutos();
  }, []);

  useEffect(() => {
    const startScanner = async () => {
      if (!videoRef.current || produtos.length === 0) return;

      try {
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setError("Nenhuma câmara detectada");
          setScannerStatus("Câmara indisponível");
          return;
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result: any) => {
            const codigo = result?.data ? String(result.data).trim() : String(result).trim();
            if (!codigo) return;
            setLastScan(codigo);
            if (codigo === lastScannedCodeRef.current) return;
            lastScannedCodeRef.current = codigo;
            setScannerStatus(`Código detectado: ${codigo}`);

            const produto = produtos.find((p) => p.qrCode === codigo || p.id === codigo);
            if (!produto) {
              setError("QR não pertence a nenhum produto");
              setScannerStatus("Aguardando código válido...");
              setTimeout(() => {
                lastScannedCodeRef.current = null;
              }, 2000);
              return;
            }

            // não permitir adicionar se stock for 0
            if (Number(produto.stock) <= 0) {
              setError(`Stock insuficiente para o produto ${produto.nome}.`);
              setScannerStatus("Aguardando código válido...");
              setTimeout(() => {
                lastScannedCodeRef.current = null;
              }, 2000);
              return;
            }

            setError(null);
            setScannerStatus(`Produto detectado: ${produto.nome}`);
            setItens((atual) => {
              const existente = atual.find((item) => item.produtoId === produto.id);
              if (existente) {
                // se já existe, só incrementa se não ultrapassar o stock
                return atual.map((item) => {
                  if (item.produtoId !== produto.id) return item;
                  const novo = item.quantidade + 1;
                  if (novo > Number(produto.stock)) {
                    setError(`Stock insuficiente para o produto ${produto.nome}.`);
                    return item;
                  }
                  setError(null);
                  return { ...item, quantidade: novo };
                });
              }

              return [...atual, { produtoId: produto.id, quantidade: 1, precoUnitario: Number(produto.precoVenda) }];
            });
            setTimeout(() => {
              lastScannedCodeRef.current = null;
            }, 2000);
          },
          { highlightScanRegion: true, highlightCodeOutline: true },
        );

        scannerRef.current = scanner;
        await scanner.start();
        setScannerStatus("A câmara está ativa. Apresente o QR code.");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(err);
        setError(message);
        setScannerStatus("Erro ao iniciar a câmara");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [produtos.length]);

  const removerItem = (index: number) => {
    setItens(itens.filter((_, idx) => idx !== index));
  };

  const [paymentAmount, setPaymentAmount] = useState(0);
  const total = itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);
  const change = paymentAmount > total ? paymentAmount - total : 0;

  const guardarVenda = async () => {
    try {
      setError(null);

      const itensValidos = itens.filter(
        (item) => item.produtoId.trim() !== "" && item.quantidade > 0 && item.precoUnitario >= 0,
      );

      if (!form.compradorNome.trim()) {
        setError("O nome do comprador é obrigatório.");
        return;
      }

      if (itensValidos.length === 0) {
        setError("Adicione pelo menos um item válido ao carrinho.");
        return;
      }

      // validar stock atual antes de criar a venda
      for (const it of itensValidos) {
        const produto = produtos.find((p) => p.id === it.produtoId);
        if (!produto) {
          setError(`Produto ${it.produtoId} não encontrado.`);
          return;
        }
        const stock = Number(produto.stock);
        if (stock <= 0) {
          setError(`Stock insuficiente para o produto ${produto.nome}.`);
          return;
        }
        if (it.quantidade > stock) {
          setError(`Quantidade solicitada para ${produto.nome} excede o stock disponível (${stock}).`);
          return;
        }
      }

      if (form.paymentMethod === "dinheiro" && paymentAmount < total) {
        setError("Valor pago insuficiente para cobrir o total da venda.");
        return;
      }

      await vendasService.criar({ ...form, itens: itensValidos });
      navigate("/vendas");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "response" in err && (err as any).response
          ? (err as any).response?.data?.erro ?? (err as any).message
          : err instanceof Error
          ? err.message
          : "Não foi possível registar a venda. Tente novamente.";
      setError(message);
    }
  };

  if (loading) return <p className="text-slate-300">A carregar...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Nova Venda</h2>
          <p className="mt-2 text-sm text-slate-400">A câmara está sempre ligada para captar QR codes diretamente na grelha de compras.</p>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </div>
        <button onClick={() => navigate("/vendas")}
          className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition">
          Voltar para Vendas
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="bg-slate-900 p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">Scanner QR</h3>
              <p className="mt-1 text-sm text-slate-400">A câmara está ativa e lê automaticamente os códigos.</p>
            </div>
            <div className="aspect-video bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Status</p>
                <p className="mt-2 text-white text-sm">{scannerStatus}</p>
                {scanError && <p className="mt-2 text-sm text-red-400">{scanError}</p>}
                {lastScan && <p className="mt-2 text-sm text-slate-400">Último código: {lastScan}</p>}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">Como usar</p>
                <p className="mt-2 text-slate-200 text-sm">Mostre o QR code do produto à câmara. O item é adicionado automaticamente ao carrinho.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Produtos disponíveis</h3>
            <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2">
              {produtos.map((produto) => (
                <div key={produto.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-white font-medium">{produto.nome}</p>
                  <p className="text-slate-400 text-sm">Stock: {produto.stock}</p>
                  <p className="text-slate-400 text-sm">Preço: {Number(produto.precoVenda).toFixed(2)} Kz</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Dados do comprador</h3>
            <div className="grid gap-3">
              <input
                placeholder="Nome do comprador *"
                value={form.compradorNome}
                onChange={(e) => setForm({ ...form, compradorNome: e.target.value })}
                className="w-full border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-lg px-3 py-2"
              />
              <div>
                <p className="text-sm text-slate-400 mb-2">Método de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "dinheiro", label: "Dinheiro" },
                    { value: "cartao", label: "Cartão" },
                    { value: "transferencia", label: "Transferência" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, paymentMethod: option.value as PaymentMethod });
                        if (option.value !== "dinheiro") setPaymentAmount(0);
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                        form.paymentMethod === option.value
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.paymentMethod === "dinheiro" && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Valor pago</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={paymentAmount || ""}
                    onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                    className="w-full border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-lg px-3 py-2"
                  />
                  <p className="text-sm text-slate-300">Troco: {change.toFixed(2)} Kz</p>
                </div>
              )}
              <textarea
                placeholder="Observações"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
                className="w-full border border-slate-700 bg-slate-900 text-white placeholder-slate-500 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Carrinho</h3>
                <p className="text-sm text-slate-400">Os produtos escaneados aparecem aqui automaticamente.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Produto</th>
                    <th className="px-3 py-3">Qtd</th>
                    <th className="px-3 py-3">Preço</th>
                    <th className="px-3 py-3">Total</th>
                    <th className="px-3 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {itens.map((item, index) => {
                    const produto = produtos.find((p) => p.id === item.produtoId);
                    const maxQty = produto ? Number(produto.stock) : Infinity;
                    const incrementar = (delta: number) => {
                      setItens((atual) => {
                        return atual.map((it, idx) => {
                          if (idx !== index) return it;
                          const nova = Math.max(1, it.quantidade + delta);
                          if (nova > maxQty) {
                            setError(`Stock insuficiente para o produto ${produto?.nome}.`);
                            return it;
                          }
                          setError(null);
                          return { ...it, quantidade: nova };
                        });
                      });
                    };

                    return (
                      <tr key={index} className="hover:bg-slate-900">
                        <td className="px-3 py-3 font-medium">{produto?.nome ?? "Sem produto"}</td>
                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-2">
                            <button onClick={() => incrementar(-1)} className="px-2 py-1 rounded border border-slate-700">-</button>
                            <span className="px-3 py-1 bg-slate-900 rounded">{item.quantidade}</span>
                            <button onClick={() => incrementar(1)} className="px-2 py-1 rounded border border-slate-700">+</button>
                          </div>
                          <div className="text-xs text-slate-400">Min: 1 — Stock: {produto?.stock ?? "—"}</div>
                        </td>
                        <td className="px-3 py-3 text-right">{item.precoUnitario.toFixed(2)} Kz</td>
                        <td className="px-3 py-3 text-right">{(item.quantidade * item.precoUnitario).toFixed(2)} Kz</td>
                        <td className="px-3 py-3">
                          <button onClick={() => removerItem(index)} className="text-red-400 hover:text-red-500">Remover</button>
                        </td>
                      </tr>
                    );
                  })}
                  {itens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">Carrinho vazio.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-white font-semibold">Total do carrinho: {total.toFixed(2)} Kz</p>
              <button onClick={guardarVenda} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Confirmar Venda
              </button>
            </div>
          </div>

        </section>
      </div>
    </div>
  );
}
