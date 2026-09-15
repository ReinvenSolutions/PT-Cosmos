import validator from "validator";
import type { User } from "@shared/schema";

/** Minutos de validez del código 2FA. */
export const TWO_FACTOR_CODE_EXPIRY_MINUTES = 10;

/**
 * Determina a qué correo enviar el código 2FA.
 * Prioriza el identificador con el que el usuario inició sesión si coincide con su cuenta,
 * para evitar enviar el código a un buzón distinto al que el usuario está revisando.
 */
export function resolveTwoFactorEmail(user: User, loginIdentifier: string): string | null {
  const trimmedLogin = loginIdentifier.trim();
  const loginLower = trimmedLogin.toLowerCase();
  const emailLower = user.email?.trim().toLowerCase() ?? null;
  const usernameLower = user.username.trim().toLowerCase();

  if (validator.isEmail(trimmedLogin)) {
    if (loginLower === emailLower || loginLower === usernameLower) {
      return trimmedLogin;
    }
  }

  if (user.email && validator.isEmail(user.email)) {
    return user.email.trim();
  }

  if (validator.isEmail(user.username)) {
    return user.username.trim();
  }

  return null;
}

/** Correo de destino 2FA a partir del usuario (p. ej. reenvío sin identificador de login). */
export function resolveUserEmailForTwoFactor(user: User): string | null {
  if (user.email && validator.isEmail(user.email)) {
    return user.email.trim();
  }
  if (validator.isEmail(user.username)) {
    return user.username.trim();
  }
  return null;
}

/** Oculta parte del correo para mostrar en UI (ej. ge***@cosmosmayorista.com). */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = Math.min(2, local.length);
  return `${local.slice(0, visible)}${"*".repeat(Math.max(1, local.length - visible))}@${domain}`;
}

/** En local, si Brevo bloquea la IP, devolvemos el código 2FA para no quedar fuera. */
export function canExposeDevTwoFactorCode(): boolean {
  return process.env.NODE_ENV === "development";
}

export type TwoFactorEmailFailure = {
  code?: string;
  message?: string;
};

/** Brevo con lista de IPs autorizadas rechaza Railway (IP dinámica). */
export function isBrevoUnauthorisedIpFailure(failure: TwoFactorEmailFailure): boolean {
  const blob = `${failure.code ?? ""} ${failure.message ?? ""}`.toLowerCase();
  return (
    blob.includes("unrecognised ip") ||
    blob.includes("unrecognized ip") ||
    blob.includes("authorised_ips") ||
    blob.includes("authorized_ips")
  );
}

export function twoFactorSendFailureMessage(
  emailMasked: string,
  failure?: TwoFactorEmailFailure,
): string {
  if (failure && isBrevoUnauthorisedIpFailure(failure)) {
    return `No pudimos enviar el código a ${emailMasked} porque Brevo bloqueó la IP del servidor. Desactiva las IPs autorizadas en https://app.brevo.com/security/authorised_ips (Railway no tiene IP fija).`;
  }
  return `No pudimos enviar el código a ${emailMasked}. Verifica que el correo sea correcto o contacta al administrador.`;
}
