import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

import { authService } from "../services";
import type { Utilizador } from "../types";

interface AuthContextType {
  utilizador: Omit<Utilizador, "ativo" | "createdAt"> | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [utilizador, setUtilizador] = useState<Omit<Utilizador, "ativo" | "createdAt"> | null>(null);

  useEffect(() => {
    const guardado = localStorage.getItem("utilizador");
    if (guardado) setUtilizador(JSON.parse(guardado));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, utilizador } = await authService.login(email, password);
    localStorage.setItem("token", token);
    localStorage.setItem("utilizador", JSON.stringify(utilizador));
    setUtilizador(utilizador);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("utilizador");
    setUtilizador(null);
  };

  return (
    <AuthContext.Provider value={{ utilizador, login, logout, isAdmin: utilizador?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
};