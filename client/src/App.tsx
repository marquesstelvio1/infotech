import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/authcontexts";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardAtendente from "./pages/DashboardAtendente";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import Movimentos from "./pages/Movimentos";
import Utilizadores from "./pages/Utilizadores";
import Financas from "./pages/Financas";

const RotaProtegida = ({ children }: { children: React.ReactNode }) => {
  const { utilizador } = useAuth();
  return utilizador ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { utilizador } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={utilizador ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route path="/dashboard"  element={utilizador?.role === "admin" ? <Dashboard /> : <DashboardAtendente />} />
        <Route path="/produtos"   element={<Produtos />} />
        <Route path="/vendas"     element={<Vendas />} />
        <Route path="/vendas/novo" element={<NovaVenda />} />
        <Route path="/movimentos"   element={<Movimentos />} />
        <Route path="/utilizadores" element={<Utilizadores />} />
        <Route path="/financas" element={utilizador?.role === "admin" ? <Financas /> : <Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}