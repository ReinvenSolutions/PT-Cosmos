import type { Request, Response, NextFunction } from "express";
import type { User as DbUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      passwordHash: string;
      role: string;
      createdAt: Date | null;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autenticado" });
  }
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = req.user as Express.User;
    if (user.role !== role) {
      return res.status(403).json({ message: "No autorizado" });
    }

    next();
  };
}

export function requireRoles(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = req.user as Express.User;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    next();
  };
}
