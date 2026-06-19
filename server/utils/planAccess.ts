import type { Destination, User } from "@shared/schema";
import { ROLES } from "@shared/roles";
import { ForbiddenError } from "../errors/AppError";

export function isAgencyOwnedPlan(dest: Pick<Destination, "createdByUserId">): boolean {
  return !!dest.createdByUserId;
}

export function canCreatePlans(role: string): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.PROVIDER;
}

export function ownsPlan(userId: string, dest: Pick<Destination, "createdByUserId">): boolean {
  return dest.createdByUserId === userId;
}

export function canEditPlan(user: Pick<User, "id" | "role">, dest: Pick<Destination, "createdByUserId">): boolean {
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.PROVIDER) return ownsPlan(user.id, dest);
  return false;
}

/** Solo el super admin puede eliminar planes (incluidos los de proveedor). */
export function canDeletePlan(user: Pick<User, "role">): boolean {
  return user.role === ROLES.SUPER_ADMIN;
}

export function resolveAgencyDisplayName(user: Pick<User, "name" | "username">): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.username;
}

export function assertCanEditPlan(user: User, dest: Destination): void {
  if (!canEditPlan(user, dest)) {
    throw new ForbiddenError("No tienes permiso para editar este plan");
  }
}

export function assertCanDeletePlan(user: User): void {
  if (!canDeletePlan(user)) {
    throw new ForbiddenError("Solo un super administrador puede eliminar planes");
  }
}
