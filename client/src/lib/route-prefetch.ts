/**
 * Prefetch de chunks de rutas al hacer hover en enlaces.
 * Reduce la demora al cambiar de sección (de segundos a casi instantáneo).
 */
import { queryClient } from "@/lib/queryClient";

const routeToImport: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/home"),
  "/admin/dashboard": () => import("@/pages/admin-dashboard"),
  "/admin/plans": () => import("@/pages/admin-plans"),
  "/admin/plans/new": () => import("@/pages/admin-plan-form"),
  "/mis-clientes": () => import("@/pages/clients"),
  "/admin/clients": () => import("@/pages/clients"),
  "/admin/users": () => import("@/pages/admin-users"),
  "/advisor": () => import("@/pages/advisor-dashboard"),
  "/cotizacion": () => import("@/pages/quote-summary"),
  "/cotizacion-express": () => import("@/pages/quote-express"),
  "/tutoriales": () => import("@/pages/tutoriales"),
  "/herramientas/contador-dias": () => import("@/pages/tools-day-counter"),
  "/herramientas/cotizador-millas": () => import("@/pages/tools-miles-calculator"),
  "quote-detail": () => import("@/pages/quote-detail"),
  "quote-edit": () => import("@/pages/quote-edit"),
  "admin-plan-form": () => import("@/pages/admin-plan-form"),
  "plan-detail": () => import("@/pages/plan-detail"),
};

const prefetched = new Set<string>();

function prefetchKey(key: string): void {
  const fn = routeToImport[key];
  if (fn && !prefetched.has(key)) {
    prefetched.add(key);
    fn().catch(() => {});
  }
}

export function prefetchRoute(path: string): void {
  const normalized = path.replace(/\/$/, "") || "/";
  const exact = routeToImport[normalized];
  if (exact && !prefetched.has(normalized)) {
    prefetched.add(normalized);
    exact().catch(() => {});
  }
  // Prefetch admin-plan-form al pasar por Admin Planes (usuario suele ir a new/edit)
  if (normalized === "/admin/plans") prefetchKey("admin-plan-form");
  // Rutas dinámicas: /advisor/quotes/:id y /advisor/quotes/:id/edit
  if (/^\/advisor\/quotes\/[^/]+\/edit$/.test(normalized)) prefetchKey("quote-edit");
  else if (/^\/advisor\/quotes\/[^/]+$/.test(normalized)) prefetchKey("quote-detail");
  if (/^\/admin\/plans\/[^/]+\/edit$/.test(normalized)) prefetchKey("admin-plan-form");
  if (/^\/plan\/[^/]+$/.test(normalized)) prefetchKey("plan-detail");
  if (normalized === "/cotizacion" || normalized === "/cotizacion-express") {
    void queryClient.prefetchQuery({ queryKey: ["/api/destinations?isActive=true"] });
  }
}

/** Anticipa el chunk y el JSON de la ficha al pasar el mouse por un plan. */
export function prefetchPlan(id: string): void {
  prefetchKey("plan-detail");
  void queryClient.prefetchQuery({ queryKey: [`/api/destinations/${id}`] });
}
