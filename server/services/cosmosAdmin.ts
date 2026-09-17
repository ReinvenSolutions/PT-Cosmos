import type { Destination, User } from "@shared/schema";
import { formatUSD } from "@shared/schema";
import {
  parseCosmosAdminMutation,
  type CosmosAdminMutation,
  type CosmosClientAction,
} from "@shared/cosmosAgent";
import {
  normalizeEnabledModules,
  reconcileMilesModuleAccess,
  resolveUserModuleIds,
  userModuleLabel,
  USER_MODULE_IDS,
  USER_MODULES,
  type EnabledModules,
  type UserModuleId,
} from "@shared/modules";
import {
  MILES_PROGRAMS_ALLOWED,
  normalizeMilesProgramsAllowed,
  type MilesProgramsAllowed,
} from "@shared/milesCalculator";
import { ROLE_LABELS, ROLES } from "@shared/roles";
import { canEditPlan } from "../utils/planAccess";
import { clearDestinationCache } from "../utils/cache";
import { logger } from "../logger";
import { storage } from "../storage";
import { getCosmosSessionStats } from "./cosmosSessionService";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CosmosAdminActor = {
  id: string;
  role: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function requireSuperAdmin(actor: CosmosAdminActor | undefined): string | null {
  if (actor?.role !== ROLES.SUPER_ADMIN) {
    return "Eso solo lo puede hacer un administrador.";
  }
  return null;
}

function requirePlanManager(actor: CosmosAdminActor | undefined): string | null {
  if (actor?.role !== ROLES.SUPER_ADMIN && actor?.role !== ROLES.PROVIDER) {
    return "Solo un administrador o un proveedor puede gestionar el estado de los planes.";
  }
  return null;
}

export function percentChangeLabel(current: number, previous: number): string {
  if (!previous && !current) return "sin cambio";
  if (!previous) return "nuevo";
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  if (rounded === 0) return "sin cambio";
  return `${rounded > 0 ? "+" : ""}${rounded}% vs periodo anterior`;
}

export function formatModulesList(
  enabledModules: EnabledModules,
  milesProgramsAllowed?: string | null
): string {
  const miles = normalizeMilesProgramsAllowed(milesProgramsAllowed);
  const lines = USER_MODULE_IDS.filter((id) => id !== USER_MODULES.COSMOS_VOICE).map((id) => {
    const on = enabledModules[id] ? "sí" : "no";
    if (id === USER_MODULES.MILES_CALCULATOR) {
      return `- ${userModuleLabel(id)}: ${on}${enabledModules[id] ? ` (${miles})` : ""}`;
    }
    if (id === USER_MODULES.COSMOS) {
      return `- ${userModuleLabel(id)}: ${on} · voz: ${enabledModules.cosmosVoice ? "sí" : "no"}`;
    }
    return `- ${userModuleLabel(id)}: ${on}`;
  });
  return lines.join("\n");
}

function userLabel(user: Pick<User, "name" | "username" | "email">): string {
  const name = user.name?.trim() || user.username;
  return user.email ? `${name} (${user.email})` : name;
}

function formatUserLine(
  user: Omit<User, "passwordHash"> | User
): string {
  const role = ROLE_LABELS[user.role] ?? user.role;
  const status = user.isActive ? "activo" : "inactivo";
  const approval =
    user.approvalStatus === "pending"
      ? "pendiente"
      : user.approvalStatus === "denied"
        ? "rechazado"
        : "aprobado";
  const mods = normalizeEnabledModules(user.enabledModules);
  const on = USER_MODULE_IDS.filter((id) => id !== USER_MODULES.COSMOS_VOICE && mods[id]).map(
    (id) => (id === USER_MODULES.COSMOS && mods.cosmosVoice ? "Cosmos+voz" : userModuleLabel(id))
  );
  return `- ${userLabel(user)} · ${role} · ${status} · ${approval} · módulos: ${on.join(", ") || "ninguno"} [userId=${user.id}]`;
}

export async function getDashboardSummary(): Promise<string> {
  const [metrics, pending, cosmos, active, inactive] = await Promise.all([
    storage.getDashboardMetrics(),
    storage.countPendingApprovalUsers(),
    getCosmosSessionStats(),
    storage.getDestinations({ isActive: true }),
    storage.getDestinations({ isActive: false }),
  ]);
  const usd = (n: number) => `USD ${formatUSD(n)}`;
  const lowCupos = active.filter(
    (d) => d.isBloqueo && d.bloqueoCuposDisponibles != null && d.bloqueoCuposDisponibles <= 3
  );
  const lowLines = lowCupos.length
    ? lowCupos.map((d) => `  · ${d.name}: ${d.bloqueoCuposDisponibles} cupo(s)`).join("\n")
    : "  (ninguno con 3 cupos o menos)";
  return `Dashboard operativo:
- Cotizaciones (tracking): ${metrics.totalQuotes} · ${usd(metrics.totalAmountUSD)} · ticket promedio ${usd(metrics.ticketPromedio)}
- Esta semana: ${metrics.quotesThisWeek} (${usd(metrics.amountThisWeek)}, ${percentChangeLabel(metrics.quotesThisWeek, metrics.quotesLastWeek)}) · semana previa: ${metrics.quotesLastWeek}
- Este mes: ${metrics.quotesThisMonth} (${usd(metrics.amountThisMonth)}, ${percentChangeLabel(metrics.quotesThisMonth, metrics.quotesLastMonth)}) · mes previo: ${metrics.quotesLastMonth}
- Cotizaciones guardadas: ${metrics.savedQuotesCount} · ${usd(metrics.savedQuotesAmount)}
- Clientes: ${metrics.totalClients} (nuevos este mes: ${metrics.newClientsThisMonth})
- Usuarios/agencias: ${metrics.totalUsers} · pendientes de aprobación: ${pending}
- Planes activos: ${metrics.totalActivePlans} · inactivos: ${inactive.length}
- Sesiones Cosmos: ${cosmos.total} en total · ${cosmos.last24h} en 24h (texto ${cosmos.text}, voz ${cosmos.voice}, SIP ${cosmos.sip})
- Bloqueos con cupos bajos:
${lowLines}`;
}

export async function getAdvisorQuoteStats(limit = 12): Promise<string> {
  const stats = await storage.getQuoteStats();
  if (!stats.length) return "No hay cotizaciones guardadas por agencia todavía.";
  const top = stats.slice(0, Math.min(20, Math.max(3, limit)));
  const lines = top.map(
    (row) => `- ${row.username}: ${row.count} cotizaciones · USD ${formatUSD(row.amount)} [userId=${row.userId}]`
  );
  return `Cotizaciones guardadas por agencia (top ${top.length}):\n${lines.join("\n")}`;
}

export async function getTopDestinationStats(
  sortBy: "count" | "amount" = "count",
  limit = 8
): Promise<string> {
  const capped = Math.min(15, Math.max(3, limit));
  if (sortBy === "amount") {
    const rows = await storage.getTopDestinationsByAmount(capped);
    if (!rows.length) return "Todavía no hay destinos con monto cotizado.";
    return `Top destinos por monto:\n${rows
      .map((r) => `- ${r.destinationName}: USD ${formatUSD(r.amount)} [id=${r.destinationId}]`)
      .join("\n")}`;
  }
  const rows = await storage.getTopDestinations(capped);
  if (!rows.length) return "Todavía no hay destinos cotizados.";
  return `Top destinos por cantidad de cotizaciones:\n${rows
    .map((r) => `- ${r.destinationName}: ${r.count} veces [id=${r.destinationId}]`)
    .join("\n")}`;
}

export async function getQuotesTrend(days = 30): Promise<string> {
  const allowed = [7, 14, 30, 90];
  const window = allowed.includes(days) ? days : 30;
  const rows = await storage.getQuotesByDateRange(window);
  if (!rows.length) return `No hay cotizaciones en los últimos ${window} días.`;
  const totalCount = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const recent = rows.slice(-12);
  const lines = recent.map(
    (r) => `- ${r.date}: ${Number(r.count || 0)} · USD ${formatUSD(Number(r.amount || 0))}`
  );
  return `Tendencia últimos ${window} días (tracking): ${totalCount} cotizaciones · USD ${formatUSD(totalAmount)}.
${rows.length > recent.length ? `Últimos ${recent.length} días con movimiento:\n` : ""}${lines.join("\n")}`;
}

export async function searchAdminUsers(
  query: string,
  filter?: string,
  limit = 10
): Promise<string> {
  const users = await storage.listUsers();
  const hay = normalize(query);
  const roleFilter =
    filter === "agency" || filter === "provider" || filter === "super_admin" ? filter : "";
  const matched = users.filter((u) => {
    if (filter === "pending" && u.approvalStatus !== "pending") return false;
    if (filter === "inactive" && u.isActive) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (UUID_RE.test(query) && u.id === query) return true;
    if (!hay) return true;
    const blob = normalize(`${u.name} ${u.username} ${u.email ?? ""}`);
    return blob.includes(hay);
  });
  if (!matched.length) {
    return hay ? `No encontré usuarios para "${query}".` : "No hay usuarios con ese filtro.";
  }
  const slice = matched.slice(0, Math.min(20, Math.max(3, limit)));
  const header =
    matched.length > slice.length
      ? `${matched.length} usuarios; muestro ${slice.length}:`
      : `${slice.length} usuario(s):`;
  return `${header}\n${slice.map(formatUserLine).join("\n")}`;
}

export async function getUserAccess(query: string): Promise<string> {
  const found = await findAdminUsers(query);
  if (!found.length) return `No encontré al usuario "${query}".`;
  if (found.length > 1) {
    return `Hay varias coincidencias; indica el correo o el userId:\n${found.slice(0, 8).map(formatUserLine).join("\n")}`;
  }
  const user = found[0];
  if (user.role === ROLES.SUPER_ADMIN) {
    return `${userLabel(user)} es super admin: tiene todos los módulos siempre, no se le pueden cambiar permisos. [userId=${user.id}]`;
  }
  const mods = normalizeEnabledModules(user.enabledModules);
  return `Acceso de ${userLabel(user)} (${ROLE_LABELS[user.role] ?? user.role}, ${user.isActive ? "activo" : "inactivo"}):
${formatModulesList(mods, user.milesProgramsAllowed)}
[userId=${user.id}]`;
}

async function findAdminUsers(query: string): Promise<Array<Omit<User, "passwordHash">>> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (UUID_RE.test(trimmed)) {
    const user = await storage.findUserById(trimmed);
    if (!user) return [];
    const { passwordHash: _passwordHash, ...safe } = user;
    return [safe];
  }
  const hay = normalize(trimmed);
  const users = await storage.listUsers();
  const exact = users.filter(
    (u) =>
      normalize(u.username) === hay ||
      normalize(u.email ?? "") === hay ||
      normalize(u.name ?? "") === hay
  );
  if (exact.length === 1) return exact;
  const partial = users.filter((u) =>
    normalize(`${u.name ?? ""} ${u.username} ${u.email ?? ""}`).includes(hay)
  );
  return exact.length ? exact : partial;
}

function applyModuleToggles(
  current: EnabledModules,
  enable: UserModuleId[],
  disable: UserModuleId[]
): EnabledModules {
  const next = { ...current };
  for (const id of enable) next[id] = true;
  for (const id of disable) next[id] = false;
  if (enable.includes(USER_MODULES.COSMOS_VOICE)) next.cosmos = true;
  return next;
}

function describeModuleDiff(prev: EnabledModules, next: EnabledModules): string[] {
  const changes: string[] = [];
  for (const id of USER_MODULE_IDS) {
    if (prev[id] === next[id]) continue;
    changes.push(`${userModuleLabel(id)}: ${prev[id] ? "sí" : "no"} → ${next[id] ? "sí" : "no"}`);
  }
  return changes;
}

export async function previewOrSetUserModules(opts: {
  query: string;
  enable: string[];
  disable: string[];
  milesProgramsAllowed?: string;
}): Promise<
  | { error: string }
  | { preview: string; mutation: Extract<CosmosAdminMutation, { kind: "set_user_modules" }> }
> {
  const found = await findAdminUsers(opts.query);
  if (!found.length) return { error: `No encontré al usuario "${opts.query}".` };
  if (found.length > 1) {
    return {
      error: `Hay varias coincidencias; indica el correo o el userId:\n${found.slice(0, 8).map(formatUserLine).join("\n")}`,
    };
  }
  const user = found[0];
  if (user.role === ROLES.SUPER_ADMIN) {
    return { error: "El super admin siempre tiene todos los módulos; no se le cambian permisos." };
  }

  const enableParsed = resolveUserModuleIds(opts.enable);
  const disableParsed = resolveUserModuleIds(opts.disable);
  const unknown = [...enableParsed.unknown, ...disableParsed.unknown];
  if (unknown.length) {
    return {
      error: `No reconozco estos módulos: ${unknown.join(", ")}. Usa: cotización, express, contador, millas, academia, cosmos, voz.`,
    };
  }
  if (!enableParsed.ids.length && !disableParsed.ids.length && !opts.milesProgramsAllowed) {
    return { error: `Indica qué módulo encender o apagar para ${userLabel(user)}.` };
  }

  const current = normalizeEnabledModules(user.enabledModules);
  const toggled = applyModuleToggles(current, enableParsed.ids, disableParsed.ids);
  let miles = normalizeMilesProgramsAllowed(user.milesProgramsAllowed);
  if (opts.milesProgramsAllowed) {
    if (!(MILES_PROGRAMS_ALLOWED as readonly string[]).includes(opts.milesProgramsAllowed)) {
      return { error: "Programas de millas inválidos. Usa none, lifemiles, smiles o both." };
    }
    miles = normalizeMilesProgramsAllowed(opts.milesProgramsAllowed);
  } else if (enableParsed.ids.includes(USER_MODULES.MILES_CALCULATOR) && miles === "none") {
    miles = "both";
  }
  const reconciled = reconcileMilesModuleAccess(toggled, miles);
  const next = reconciled.enabledModules;
  const nextMiles = reconciled.milesProgramsAllowed;
  const changes = describeModuleDiff(current, next);
  const milesChanged = nextMiles !== normalizeMilesProgramsAllowed(user.milesProgramsAllowed);
  if (!changes.length && !milesChanged) {
    return { error: `${userLabel(user)} ya tiene esos módulos. No hay nada que cambiar.` };
  }

  const mutation: Extract<CosmosAdminMutation, { kind: "set_user_modules" }> = {
    kind: "set_user_modules",
    userId: user.id,
    userLabel: userLabel(user),
    enabledModules: next,
    ...(milesChanged || opts.milesProgramsAllowed ? { milesProgramsAllowed: nextMiles } : {}),
  };
  const preview = `Voy a actualizar a ${userLabel(user)}:
${changes.map((c) => `- ${c}`).join("\n")}${milesChanged ? `\n- Millas: ${normalizeMilesProgramsAllowed(user.milesProgramsAllowed)} → ${nextMiles}` : ""}`;
  return { preview, mutation };
}

export async function applySetUserModules(
  mutation: Extract<CosmosAdminMutation, { kind: "set_user_modules" }>
): Promise<string> {
  const existing = await storage.findUserById(mutation.userId);
  if (!existing) return `Ya no encuentro al usuario ${mutation.userLabel}.`;
  if (existing.role === ROLES.SUPER_ADMIN) {
    return "El super admin siempre tiene todos los módulos; no se le cambian permisos.";
  }
  const milesProgramsAllowed =
    mutation.milesProgramsAllowed ?? normalizeMilesProgramsAllowed(existing.milesProgramsAllowed);
  const { enabledModules } = reconcileMilesModuleAccess(
    normalizeEnabledModules(mutation.enabledModules),
    milesProgramsAllowed
  );
  const updates: { enabledModules: EnabledModules; milesProgramsAllowed?: string } = {
    enabledModules,
  };
  if (mutation.milesProgramsAllowed) updates.milesProgramsAllowed = milesProgramsAllowed;
  await storage.updateUserByAdmin(mutation.userId, updates);
  logger.info("Cosmos actualizó módulos de usuario", {
    userId: mutation.userId,
    enabledModules,
    milesProgramsAllowed: updates.milesProgramsAllowed,
  });
  return `Listo. Módulos de ${mutation.userLabel}:
${formatModulesList(enabledModules, updates.milesProgramsAllowed ?? existing.milesProgramsAllowed)}`;
}

function scoreManagedPlan(query: string, dest: Destination): number {
  const hay = normalize(query);
  if (!hay) return 1;
  const name = normalize(dest.name);
  const country = normalize(dest.country);
  const description = normalize(dest.description ?? "");
  if (dest.id === query.trim()) return 100;
  if (name === hay) return 90;
  if (name.startsWith(hay)) return 70;
  if (name.includes(hay)) return 50;
  if (country.includes(hay) || description.includes(hay)) return 20;
  return 0;
}

async function listManagedPlans(actor: CosmosAdminActor): Promise<Destination[]> {
  if (actor.role === ROLES.PROVIDER) {
    return storage.getDestinations({ createdByUserId: actor.id });
  }
  return storage.getDestinations();
}

export async function searchManagedPlans(
  actor: CosmosAdminActor,
  query: string,
  status?: "active" | "inactive" | "all",
  limit = 10
): Promise<string> {
  const dests = await listManagedPlans(actor);
  const hay = query.trim();
  const wanted =
    status === "active" ? true : status === "inactive" ? false : undefined;
  const scored = dests
    .filter((d) => (wanted === undefined ? true : d.isActive === wanted))
    .map((d) => ({ dest: d, score: hay ? scoreManagedPlan(hay, d) : 1 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) {
    const statusHint = status === "inactive" ? " inactivos" : status === "active" ? " activos" : "";
    return hay ? `No encontré planes${statusHint} para "${query}".` : "No hay planes para listar.";
  }
  const slice = scored.slice(0, Math.min(20, Math.max(3, limit)));
  const lines = slice.map(({ dest }) => {
    const flags = [
      dest.isActive ? "activo" : "inactivo",
      dest.isBloqueo ? "bloqueo" : null,
      dest.isPromotion ? "promo" : null,
    ].filter(Boolean);
    return `- ${dest.name} (${dest.country}) · ${flags.join(", ")} [id=${dest.id}]`;
  });
  return `Planes (${scored.length} coincidencias, muestro ${slice.length}):\n${lines.join("\n")}`;
}

async function resolveManagedPlan(
  actor: CosmosAdminActor,
  query: string,
  screenPlanId?: string
): Promise<Destination | { error: string; candidates?: Destination[] }> {
  const dests = await listManagedPlans(actor);
  const trimmed = query.trim() || screenPlanId || "";
  if (!trimmed) return { error: "Indica el nombre o el id del plan." };
  if (UUID_RE.test(trimmed)) {
    const dest = dests.find((d) => d.id === trimmed) ?? (await storage.getDestination(trimmed));
    if (!dest) return { error: `No encontré el plan "${trimmed}".` };
    if (!canEditPlan(actor, dest)) {
      return { error: `No tienes permiso para gestionar ${dest.name}.` };
    }
    return dest;
  }
  const scored = dests
    .map((d) => ({ dest: d, score: scoreManagedPlan(trimmed, d) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { error: `No encontré el plan "${query}".` };
  const top = scored.filter((x) => x.score === scored[0].score);
  if (top.length > 1 && scored[0].score < 90) {
    return {
      error: `Hay varias coincidencias para "${query}". ¿Cuál?`,
      candidates: top.slice(0, 6).map((x) => x.dest),
    };
  }
  const dest = scored[0].dest;
  if (!canEditPlan(actor, dest)) {
    return { error: `No tienes permiso para gestionar ${dest.name}.` };
  }
  return dest;
}

export async function previewOrSetPlanActive(opts: {
  actor: CosmosAdminActor;
  plan: string;
  isActive: boolean;
  screenPlanId?: string;
}): Promise<
  | { error: string }
  | { preview: string; mutation: Extract<CosmosAdminMutation, { kind: "set_plan_active" }> }
> {
  const resolved = await resolveManagedPlan(opts.actor, opts.plan, opts.screenPlanId);
  if ("error" in resolved) {
    if (resolved.candidates?.length) {
      return {
        error: `${resolved.error}\n${resolved.candidates
          .map((d) => `- ${d.name} (${d.country}) · ${d.isActive ? "activo" : "inactivo"} [id=${d.id}]`)
          .join("\n")}`,
      };
    }
    return { error: resolved.error };
  }
  const dest = resolved;
  if (dest.isActive === opts.isActive) {
    return {
      error: `${dest.name} ya está ${opts.isActive ? "activo" : "inactivo"}. No hay nada que cambiar.`,
    };
  }
  const mutation: Extract<CosmosAdminMutation, { kind: "set_plan_active" }> = {
    kind: "set_plan_active",
    planId: dest.id,
    planLabel: dest.name,
    isActive: opts.isActive,
  };
  return {
    preview: `Voy a ${opts.isActive ? "activar" : "desactivar"} el plan ${dest.name} (${dest.country}).`,
    mutation,
  };
}

export async function applySetPlanActive(
  actor: CosmosAdminActor,
  mutation: Extract<CosmosAdminMutation, { kind: "set_plan_active" }>
): Promise<string> {
  const dest = await storage.getDestination(mutation.planId);
  if (!dest) return `Ya no encuentro el plan ${mutation.planLabel}.`;
  if (!canEditPlan(actor, dest)) {
    return `No tienes permiso para gestionar ${dest.name}.`;
  }
  if (dest.isActive === mutation.isActive) {
    return `${dest.name} ya está ${mutation.isActive ? "activo" : "inactivo"}.`;
  }
  await storage.updateDestination(mutation.planId, { isActive: mutation.isActive });
  clearDestinationCache(mutation.planId);
  logger.info("Cosmos actualizó isActive de plan", {
    destinationId: mutation.planId,
    isActive: mutation.isActive,
    actorId: actor.id,
  });
  return `Listo. ${dest.name} quedó ${mutation.isActive ? "activo" : "inactivo"} en el catálogo.`;
}

export async function applyAdminMutation(
  actor: CosmosAdminActor,
  raw: unknown
): Promise<{ result: string; action?: CosmosClientAction }> {
  const mutation = parseCosmosAdminMutation(raw);
  if (!mutation) return { result: "No tengo un cambio de administración pendiente para confirmar." };
  if (mutation.kind === "set_user_modules") {
    const denied = requireSuperAdmin(actor);
    if (denied) return { result: denied };
    return {
      result: await applySetUserModules(mutation),
      action: { type: "refresh_admin", scope: "users" },
    };
  }
  const denied = requirePlanManager(actor);
  if (denied) return { result: denied };
  return {
    result: await applySetPlanActive(actor, mutation),
    action: { type: "refresh_admin", scope: "plans" },
  };
}

export { requireSuperAdmin, requirePlanManager };
