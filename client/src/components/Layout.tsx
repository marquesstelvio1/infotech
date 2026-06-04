import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authcontexts";
import { useState } from "react";
import {
  LayoutDashboard,
  Monitor,
  ShoppingCart,
  ArrowLeftRight,
  Users,
  LogOut,
  Lock,
} from "lucide-react";

import { BarChart as IconBarChart } from "lucide-react";

const links = [
  { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { to: "/produtos",     label: "Produtos",     icon: Monitor },
  { to: "/vendas",       label: "Vendas",       icon: ShoppingCart },
  { to: "/financas",     label: "Finanças",     icon: IconBarChart },
  { to: "/movimentos",   label: "Movimentos",   icon: ArrowLeftRight },
  { to: "/utilizadores", label: "Utilizadores", icon: Users },
];

export default function Layout() {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();
  const [shakeTrigger, setShakeTrigger] = useState<string | null>(null);
  const [blockedFor, setBlockedFor] = useState<string | null>(null);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex min-h-screen bg-gray-950">
      
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col border-r border-gray-800">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight">INFOTECH</h1>
          <p className="text-gray-500 text-xs mt-1">GSI Equipamentos</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {links.map((link) => {
            const isRestricted =
              ((link.to === "/utilizadores" || link.to === "/movimentos") && utilizador?.role === "atendente") ||
              (link.to === "/financas" && utilizador?.role !== "admin");

            if (isRestricted) {
              const isShaking = shakeTrigger === link.to;

              return (
                <div
                  key={link.to}
                  onClick={(e) => {
                    e.preventDefault();
                    setShakeTrigger(link.to);
                    setBlockedFor(link.to);
                    setTimeout(() => setBlockedFor(null), 2000);
                    setTimeout(() => setShakeTrigger(null), 500);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isShaking ? "animate-shake" : ""
                  } text-gray-400 cursor-not-allowed`}
                >
                  <Lock size={16} className="text-gray-400" />
                  <span>{link.label}</span>
                  {blockedFor === link.to && (
                    <span className="ml-auto text-xs text-red-400">acesso negado</span>
                  )}
                </div>
              );
            }

            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <Icon size={16} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {utilizador?.nome?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{utilizador?.nome}</p>
              <p className="text-gray-500 text-xs capitalize">{utilizador?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-8 overflow-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  );
}