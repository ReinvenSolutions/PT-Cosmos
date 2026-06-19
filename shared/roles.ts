/** Roles de plataforma (valor almacenado en users.role) */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  /** Antes "advisor" / Asesor — cotizaciones y academia */
  AGENCY: "agency",
  /** Antes "agency" / Agencia — gestión de planes propios */
  PROVIDER: "provider",
} as const;

export type PlatformRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.AGENCY]: "Agencia",
  [ROLES.PROVIDER]: "Proveedor",
};

/** Roles que pueden crear y editar planes (con restricciones de propiedad para proveedor). */
export const PLAN_MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.PROVIDER] as const;

/** Roles que cotizan: nueva cotización, express, mis cotizaciones y mis clientes. */
export const QUOTE_USER_ROLES = [ROLES.SUPER_ADMIN, ROLES.AGENCY, ROLES.PROVIDER] as const;
