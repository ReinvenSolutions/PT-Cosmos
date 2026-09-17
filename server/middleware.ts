import type { Request, Response, NextFunction } from "express";
import { PLAN_MANAGER_ROLES } from "@shared/roles";
import {
  canAccessCosmosVoice,
  canAccessModule,
  type ModuleAccessUser,
  type UserModuleId,
} from "@shared/modules";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      passwordHash: string;
      role: string;
      createdAt: Date | null;
      enabledModules?: unknown;
      milesProgramsAllowed?: string | null;
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

export function requireModule(moduleId: UserModuleId) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const user = req.user as ModuleAccessUser;
    if (!canAccessModule(user, moduleId)) {
      return res.status(403).json({ message: "Módulo no habilitado" });
    }

    next();
  };
}

export function requireCosmosVoice(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autenticado" });
  }

  const user = req.user as ModuleAccessUser;
  if (!canAccessCosmosVoice(user)) {
    return res.status(403).json({ message: "Voz de Cosmos no habilitada" });
  }

  next();
}

/** Super admin o proveedor (gestión de planes con reglas de propiedad en las rutas). */
export const requirePlanManagers = requireRoles([...PLAN_MANAGER_ROLES]);
