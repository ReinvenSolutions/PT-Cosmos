/**
 * Prefetch de chunks de rutas al hacer hover en enlaces.
 * Reduce la demora al cambiar de sección (de segundos a casi instantáneo).
 */

const routeToImport: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/home"),
  "/admin/dashboard": () => import("@/pages/admin-dashboard"),
  "/admin/plans": () => import("@/pages/admin-plans"),
  "/admin/plans/new": () => import("@/pages/admin-plan-form"),
  "/admin/clients": () => import("@/pages/clients"),
  "/admin/users": () => import("@/pages/admin-users"),
  "/advisor": () => import("@/pages/advisor-dashboard"),
  "/cotizacion": () => import("@/pages/quote-summary"),
  "/cotizacion-express": () => import("@/pages/quote-express"),
  "quote-detail": () => import("@/pages/quote-detail"),
  "quote-edit": () => import("@/pages/quote-edit"),
  "admin-plan-form": () => import("@/pages/admin-plan-form"),
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
}
