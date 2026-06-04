import heroImg from "../assets/hero.png";

interface Props {
  id: string;
  nome: string;
  categoria?: string;
  marca?: string;
  stock?: number;
  precoVenda?: string | number;
  quantidadeVendida?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenQr?: () => void;
  imageVersion?: number;
}

export default function ProductCard({ id, nome, categoria, marca, stock, precoVenda, quantidadeVendida, onEdit, onDelete, onOpenQr, imageVersion }: Props) {
  const serverBase = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api").replace(/\/api\/?$/, "");

  return (
    <div className="bg-gray-900 rounded-xl p-4 shadow-sm border border-slate-800 flex flex-col">
      <div className="w-full h-36 bg-gray-700 rounded-md overflow-hidden mb-3 flex items-center justify-center">
        <img src={`${serverBase}/assets/products/${id}.jpg${imageVersion ? `?v=${imageVersion}` : ''}`} onError={(e) => { (e.target as HTMLImageElement).src = heroImg; }} alt={nome} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1">
        <div className="text-white font-semibold truncate">{nome}</div>
        {categoria && <div className="text-gray-400 text-xs mt-1 capitalize">{categoria.replace("_", " ")}</div>}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-300">{marca ?? "—"}</div>
          {typeof precoVenda !== "undefined" && (
            <div className="text-sm font-medium text-white text-right">{Number(precoVenda).toFixed(2)} Kz</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
        <div>
          <div>Stock: <span className={`ml-1 ${stock !== undefined && stock <= 3 ? 'text-red-400 font-bold' : stock !== undefined && stock <= 10 ? 'text-amber-300 font-semibold' : 'text-emerald-300'}`}>{stock ?? '—'}</span></div>
          {typeof quantidadeVendida !== 'undefined' && (
            <div className="text-xs text-gray-300 mt-1">Vendidos: <span className="text-gray-200 font-semibold">{quantidadeVendida}</span></div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
            {onOpenQr && <button onClick={onOpenQr} className="text-cyan-400 hover:underline text-sm">QR</button>}
            {onEdit && <button onClick={onEdit} className="text-blue-400 hover:underline text-sm">Editar</button>}
            {onDelete && <button onClick={onDelete} className="text-red-400 hover:underline text-sm">Eliminar</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
