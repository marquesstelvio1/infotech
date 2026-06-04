import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  utilizador?: TokenPayload;
}

export const autenticar = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "Acesso não autorizado. Token ausente." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("ERRO: JWT_SECRET não configurado no .env");
      return res.status(500).json({ erro: "Erro interno no servidor" });
    }
    
    const decoded = jwt.verify(token, secret) as any;
    req.utilizador = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
};

/**
 * Fábrica de middleware para autorizar papéis específicos.
 * Permite hierarquia (ex: admin pode acessar tudo).
 */
const autorizar = (rolesPermitidas: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.utilizador || !rolesPermitidas.includes(req.utilizador.role)) {
      return res.status(403).json({ erro: "Acesso negado: privilégios insuficientes." });
    }
    next();
  };
};

export const apenasAdmin = autorizar(["admin"]);
export const apenasDev   = autorizar(["desenvolvedor", "admin"]);
export const apenasVendedor = autorizar(["atendente", "vendedor", "admin"]);