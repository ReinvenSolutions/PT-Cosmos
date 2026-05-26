import type { User } from "@shared/schema";

export const USER_APPROVAL_APPROVED = "approved";
export const USER_APPROVAL_PENDING = "pending";
export const USER_APPROVAL_DENIED = "denied";

export type UserApprovalStatus =
  | typeof USER_APPROVAL_APPROVED
  | typeof USER_APPROVAL_PENDING
  | typeof USER_APPROVAL_DENIED;

/** Mensaje de bloqueo de login según estado de la cuenta. */
export function getLoginBlockMessage(user: Pick<User, "approvalStatus" | "isActive">): string | null {
  if (user.approvalStatus === USER_APPROVAL_PENDING) {
    return "Tu registro está pendiente de aprobación. Un administrador revisará tu solicitud y te notificará cuando puedas acceder.";
  }
  if (user.approvalStatus === USER_APPROVAL_DENIED) {
    return "Tu solicitud de registro fue denegada. Contacta al administrador si necesitas más información.";
  }
  if (!user.isActive) {
    return "Tu cuenta ha sido desactivada. Contacta al administrador.";
  }
  return null;
}

export function canUserAccessPlatform(user: Pick<User, "approvalStatus" | "isActive">): boolean {
  return getLoginBlockMessage(user) === null;
}
