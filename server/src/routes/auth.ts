import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
  };
}

/**
 * Middleware para validar o token JWT e anexar o usuário à requisição
 */
export const autenticar = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
  }

  try {
    const secret = process.env.JWT_SECRET || "sua_chave_secreta_padrao";
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido ou expirado." });
  }
};

/**
 * Fábrica de middleware para autorizar papéis específicos
 */
const autorizar = (rolesPermitidas: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !rolesPermitidas.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado: privilégios insuficientes." });
    }
    next();
  };
};

export const apenasAdmin = autorizar(["admin"]);
export const apenasDev   = autorizar(["desenvolvedor", "admin"]);
export const apenasVendedor = autorizar(["atendente", "vendedor", "admin"]);