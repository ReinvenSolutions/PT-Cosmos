/** Contactos oficiales Cosmos Mayorista (Colombia +57) — fuente única para UI y asistente Cosmos. */

/** Registro Nacional de Turismo (Colombia) — mismo texto en toda la UI. */
export const COMPANY_RNT_LINE = "RNT: Registro No. 240799";

export const COMPANY_ADDRESS = {
  street: "CRA 53 # 50 - 67",
  city: "Venecia, Antioquia",
  full: "CRA 53 # 50 - 67, Venecia, Antioquia",
} as const;

export type CompanyContact = {
  name?: string;
  phoneDisplay: string;
  /** Sin + ni espacios, ej. 573106776640 */
  phoneE164: string;
  area: string;
  /** Texto antes del teléfono en la UI, ej. tipo de atención */
  labelBeforePhone?: string;
  /** Texto extra, ej. disponibilidad */
  note?: string;
};

export const RESERVATIONS_EMAIL = "reservas@cosmosmayorista.com";

export const OPERATIVE_MAIN: CompanyContact = {
  phoneDisplay: "314 657 6500",
  phoneE164: "573146576500",
  area: "Operativo principal",
  labelBeforePhone: "Reservas y cotizaciones",
  note: "Disponible 24/7",
};

export const TEAM_CONTACTS: CompanyContact[] = [
  {
    name: "Edison Zúñiga",
    phoneDisplay: "312 282 7422",
    phoneE164: "573122827422",
    area: "Área contable y facturación",
  },
  {
    name: "Alejandro García",
    phoneDisplay: "312 278 7778",
    phoneE164: "573122787778",
    area: "Cotizaciones terrestres",
  },
  {
    name: "Tomas Pineda",
    phoneDisplay: "310 677 6640",
    phoneE164: "573106776640",
    area: "Gerencia comercial y producto",
  },
];

/** Contacto destacado en pantallas de autenticación */
export const COMMERCIAL_LEAD =
  TEAM_CONTACTS.find((c) => c.phoneE164 === "573106776640") ?? TEAM_CONTACTS[TEAM_CONTACTS.length - 1];
