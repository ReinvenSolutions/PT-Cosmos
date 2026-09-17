import { canAccessMilesCalculator, canAccessModule, USER_MODULES } from "./modules";
import { ROLES } from "./roles";
import { COSMOS_HIGHLIGHT_TARGETS, type CosmosHighlightTarget } from "./cosmosAgent";

export const COSMOS_PLACES = [
  "catalog",
  "plan",
  "quote",
  "quote_express",
  "my_quotes",
  "quote_detail",
  "clients",
  "academy",
  "academy_lesson",
  "day_counter",
  "miles",
  "admin_dashboard",
  "admin_plans",
  "admin_plan_new",
  "admin_plan_edit",
  "admin_users",
  "admin_clients",
  "admin_tutorials",
  "admin_cosmos",
] as const;

export type CosmosPlace = (typeof COSMOS_PLACES)[number];

export const COSMOS_SIDEBAR_TARGET_BY_PATH: Record<string, CosmosHighlightTarget> = {
  "/": "sidebar.quote",
  "/cotizacion-express": "sidebar.quoteExpress",
  "/advisor": "sidebar.quotes",
  "/mis-clientes": "sidebar.clients",
  "/tutoriales": "sidebar.academy",
  "/herramientas/contador-dias": "sidebar.dayCounter",
  "/herramientas/cotizador-millas": "sidebar.miles",
  "/admin/dashboard": "sidebar.adminDashboard",
  "/admin/plans": "sidebar.adminPlans",
  "/admin/users": "sidebar.adminUsers",
  "/admin/clients": "sidebar.adminClients",
  "/admin/tutoriales": "sidebar.adminTutorials",
  "/admin/cosmos": "sidebar.adminCosmos",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CosmosNavUser = {
  role: string;
  enabledModules?: unknown;
  milesProgramsAllowed?: string | null;
};

export type CosmosNavResult =
  | { ok: true; path: string; title: string }
  | { ok: false; error: string };

export function resolveCosmosNavigation(
  place: string,
  user: CosmosNavUser,
  ids?: { planId?: string; quoteId?: string; courseId?: string; lessonId?: string }
): CosmosNavResult {
  if (!(COSMOS_PLACES as readonly string[]).includes(place)) {
    return { ok: false, error: `No reconozco el destino "${place}".` };
  }
  const role = user.role;
  const isAdmin = role === ROLES.SUPER_ADMIN;
  const isProvider = role === ROLES.PROVIDER;
  const canQuote = isAdmin || role === ROLES.AGENCY || isProvider;

  switch (place as CosmosPlace) {
    case "catalog":
      if (!canAccessModule(user, USER_MODULES.QUOTE)) {
        return { ok: false, error: "No tienes el módulo de cotización." };
      }
      return { ok: true, path: "/", title: "Nueva cotización" };
    case "plan": {
      if (!ids?.planId || !UUID_RE.test(ids.planId)) {
        return { ok: false, error: "Indica un plan válido para abrir la ficha." };
      }
      if (!canAccessModule(user, USER_MODULES.QUOTE)) {
        return { ok: false, error: "No tienes el módulo de cotización." };
      }
      return { ok: true, path: `/plan/${ids.planId}`, title: "Ficha del plan" };
    }
    case "quote":
      if (!canAccessModule(user, USER_MODULES.QUOTE)) {
        return { ok: false, error: "No tienes el módulo de cotización." };
      }
      return { ok: true, path: "/cotizacion", title: "Cotización" };
    case "quote_express":
      if (!canAccessModule(user, USER_MODULES.QUOTE_EXPRESS)) {
        return { ok: false, error: "No tienes el cotizador express." };
      }
      return { ok: true, path: "/cotizacion-express", title: "Cotización express" };
    case "my_quotes":
      if (!canQuote || isAdmin) {
        if (isAdmin) return { ok: true, path: "/admin/dashboard", title: "Dashboard" };
        return { ok: false, error: "No puedes ver el listado de cotizaciones." };
      }
      return { ok: true, path: "/advisor", title: "Mis cotizaciones" };
    case "quote_detail": {
      if (!ids?.quoteId || !UUID_RE.test(ids.quoteId)) {
        return { ok: false, error: "Indica el id de la cotización." };
      }
      if (!canQuote) return { ok: false, error: "No puedes abrir cotizaciones." };
      return { ok: true, path: `/advisor/quotes/${ids.quoteId}`, title: "Detalle de cotización" };
    }
    case "clients":
      if (isAdmin) return { ok: true, path: "/admin/clients", title: "Clientes" };
      if (!canQuote) return { ok: false, error: "No puedes ver clientes." };
      return { ok: true, path: "/mis-clientes", title: "Mis clientes" };
    case "academy":
      if (!canAccessModule(user, USER_MODULES.ACADEMY)) {
        return { ok: false, error: "No tienes el módulo de Academia." };
      }
      return { ok: true, path: "/tutoriales", title: "Academia digital" };
    case "academy_lesson": {
      if (!canAccessModule(user, USER_MODULES.ACADEMY)) {
        return { ok: false, error: "No tienes el módulo de Academia." };
      }
      if (!ids?.courseId || !UUID_RE.test(ids.courseId)) {
        return { ok: false, error: "Indica el curso de la academia." };
      }
      if (ids.lessonId && UUID_RE.test(ids.lessonId)) {
        return {
          ok: true,
          path: `/tutoriales/curso/${ids.courseId}/leccion/${ids.lessonId}`,
          title: "Lección de academia",
        };
      }
      return { ok: true, path: `/tutoriales/curso/${ids.courseId}`, title: "Curso de academia" };
    }
    case "day_counter":
      if (!canAccessModule(user, USER_MODULES.DAY_COUNTER)) {
        return { ok: false, error: "No tienes el contador de días." };
      }
      return { ok: true, path: "/herramientas/contador-dias", title: "Contador de días" };
    case "miles":
      if (!canAccessMilesCalculator(user)) {
        return { ok: false, error: "No tienes la calculadora de millas." };
      }
      return { ok: true, path: "/herramientas/cotizador-millas", title: "Cotizador de millas" };
    case "admin_dashboard":
      if (!isAdmin) return { ok: false, error: "Solo un administrador puede ir al dashboard." };
      return { ok: true, path: "/admin/dashboard", title: "Dashboard" };
    case "admin_plans":
      if (!isAdmin && !isProvider) {
        return { ok: false, error: "No puedes administrar planes." };
      }
      return { ok: true, path: "/admin/plans", title: "Administrar planes" };
    case "admin_plan_new":
      if (!isAdmin && !isProvider) {
        return { ok: false, error: "No puedes crear planes." };
      }
      return { ok: true, path: "/admin/plans/new", title: "Nuevo plan" };
    case "admin_plan_edit": {
      if (!isAdmin && !isProvider) {
        return { ok: false, error: "No puedes editar planes." };
      }
      if (!ids?.planId || !UUID_RE.test(ids.planId)) {
        return { ok: false, error: "Indica el plan a editar." };
      }
      return { ok: true, path: `/admin/plans/${ids.planId}/edit`, title: "Editar plan" };
    }
    case "admin_users":
      if (!isAdmin) return { ok: false, error: "Solo un administrador gestiona usuarios." };
      return { ok: true, path: "/admin/users", title: "Usuarios" };
    case "admin_clients":
      if (!isAdmin) return { ok: false, error: "Solo un administrador ve todos los clientes." };
      return { ok: true, path: "/admin/clients", title: "Clientes" };
    case "admin_tutorials":
      if (!isAdmin) return { ok: false, error: "Solo un administrador gestiona la academia." };
      return { ok: true, path: "/admin/tutoriales", title: "Academia (cursos)" };
    case "admin_cosmos":
      if (!isAdmin) return { ok: false, error: "Solo un administrador configura Cosmos." };
      return { ok: true, path: "/admin/cosmos", title: "Asistente Cosmos" };
    default:
      return { ok: false, error: `No reconozco el destino "${place}".` };
  }
}

export function isKnownHighlightTarget(target: string): target is CosmosHighlightTarget {
  return (COSMOS_HIGHLIGHT_TARGETS as readonly string[]).includes(target);
}
