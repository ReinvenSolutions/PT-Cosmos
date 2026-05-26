/** Roles de plataforma (valor almacenado en users.role) */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADVISOR: "advisor",
  AGENCY: "agency",
} as const;

export type PlatformRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADVISOR]: "Asesor",
  [ROLES.AGENCY]: "Agencia",
};

/** Roles que pueden crear y editar planes (con restricciones de propiedad para agencia). */
export const PLAN_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.AGENCY] as const;
