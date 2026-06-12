import { ROLES } from "@shared/roles";

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/** Ruta de destino tras login según rol del usuario. */
export function getPostLoginPath(role: string): string {
  if (role === ROLES.SUPER_ADMIN) return "/admin/dashboard";
  if (role === ROLES.AGENCY) return "/admin/plans";
  if (role === ROLES.ADVISOR) return "/advisor";
  return "/";
}
