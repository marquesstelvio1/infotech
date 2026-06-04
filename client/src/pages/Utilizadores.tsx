import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/authcontexts";
import type { Utilizador } from "../types";

const PROTEGIDOS = [
  "admin@infotech.ao",
  "stelvio715@gmail.com",
];

export default function Utilizadores() {
  const { utilizador } = useAuth();
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", password: "", role: "atendente" as "admin" | "atendente", telefone: "" });
  const [erro, setErro] = useState("");

  const carregar = async () => {
    const { data } = await api.get("/utilizadores");
    setUtilizadores(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const guardar = async () => {
    setErro("");
    try {
      await api.post("/auth/registro", form);
      setModal(false);
      setForm({ nome: "", email: "", password: "", role: "atendente", telefone: "" });
      carregar();
    } catch (e: any) {
      setErro(e.response?.data?.erro ?? "Erro ao criar utilizador");
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await api.put(`/utilizadores/${id}`, { ativo: !ativo });
    carregar();
  };

  if (loading) return <p className="text-gray-500">A carregar...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Funcionários</h2>
        <button
          onClick={() => setModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Novo Funcionário
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl shadow overflow-hidden border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {utilizadores.map((u) => (
              <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800">
                <td className="px-4 py-3 font-medium text-white">{u.nome}</td>
                <td className="px-4 py-3 text-slate-300">{u.email}</td>
                <td className="px-4 py-3 text-slate-300">{u.telefone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                  }`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAtivo(u.id, u.ativo)}
                    disabled={PROTEGIDOS.includes(u.email) || u.id === utilizador?.id}
                    className={`text-sm ${PROTEGIDOS.includes(u.email) || u.id === utilizador?.id ? "text-slate-500 cursor-not-allowed" : u.ativo ? "text-red-500 hover:underline" : "text-green-600 hover:underline"}`}
                  >
                    {PROTEGIDOS.includes(u.email) || u.id === utilizador?.id ? "Protegido" : u.ativo ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
            {utilizadores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Nenhum funcionário registado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-950 text-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-800">
            <h3 className="text-lg font-bold mb-4 text-white">Novo Funcionário</h3>
            <div className="space-y-3">
              <input
                placeholder="Nome *"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="Password *"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "atendente" })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              >
                <option value="atendente">Atendente</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {erro && <p className="text-red-400 text-sm mt-2">{erro}</p>}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setModal(false); setErro(""); }}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}