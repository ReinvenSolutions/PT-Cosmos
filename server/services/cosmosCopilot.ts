import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  clients,
  destinations,
  itineraryDays,
  quoteDestinations,
  quotes,
  tutorialCourses,
  tutorialLessons,
} from "@shared/schema";
import { canAccessModule, USER_MODULES } from "@shared/modules";
import { ROLES } from "@shared/roles";
import { htmlToPlainText } from "../utils/sanitize";
import { db } from "../db";
import { storage } from "../storage";
import type { CosmosNavUser } from "@shared/cosmosNavigation";
import { getPlanDetailText, resolveCatalogPlanId } from "./cosmosKnowledge";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function searchUserQuotes(userId: string, query: string, limit = 8): Promise<string> {
  const trimmed = query.trim();
  const pattern = trimmed ? `%${trimmed}%` : null;
  const rows = await db
    .select({
      id: quotes.id,
      totalPrice: quotes.totalPrice,
      createdAt: quotes.createdAt,
      originCity: quotes.originCity,
      clientName: clients.name,
      clientEmail: clients.email,
      planName: destinations.name,
    })
    .from(quotes)
    .innerJoin(clients, eq(quotes.clientId, clients.id))
    .leftJoin(quoteDestinations, eq(quoteDestinations.quoteId, quotes.id))
    .leftJoin(destinations, eq(quoteDestinations.destinationId, destinations.id))
    .where(
      pattern
        ? and(
            eq(quotes.userId, userId),
            or(ilike(clients.name, pattern), ilike(clients.email, pattern), ilike(destinations.name, pattern))
          )
        : eq(quotes.userId, userId)
    )
    .orderBy(desc(quotes.createdAt))
    .limit(40);

  if (!rows.length) {
    return trimmed
      ? `No encontré cotizaciones tuyas para "${trimmed}".`
      : "No tienes cotizaciones guardadas todavía.";
  }

  const byId = new Map<
    string,
    { id: string; totalPrice: string; createdAt: Date | null; originCity: string | null; clientName: string; plans: string[] }
  >();
  for (const row of rows) {
    const current = byId.get(row.id);
    if (current) {
      if (row.planName && !current.plans.includes(row.planName)) current.plans.push(row.planName);
      continue;
    }
    byId.set(row.id, {
      id: row.id,
      totalPrice: String(row.totalPrice ?? "0"),
      createdAt: row.createdAt,
      originCity: row.originCity,
      clientName: row.clientName,
      plans: row.planName ? [row.planName] : [],
    });
  }

  const items = Array.from(byId.values()).slice(0, limit);
  const lines = items.map((q) => {
    const date = q.createdAt ? q.createdAt.toISOString().slice(0, 10) : "—";
    const plans = q.plans.length ? q.plans.join(" + ") : "sin destinos";
    return `- ${q.clientName} · ${plans} · USD ${q.totalPrice} · ${date} [quoteId=${q.id}]`;
  });
  return `Cotizaciones encontradas:\n${lines.join("\n")}`;
}

export async function getUserQuoteDetail(userId: string, quoteId: string): Promise<string> {
  const quote = await storage.getQuote(quoteId, userId);
  if (!quote) return `No encontré esa cotización o no te pertenece.`;
  const dests = quote.destinations
    .map((d) => {
      const date = d.startDate instanceof Date ? d.startDate.toISOString().slice(0, 10) : String(d.startDate);
      return `  · ${d.destination.name} (${d.destination.country}) — ${date} — ${d.passengers} pax — USD ${d.price ?? d.destination.basePrice ?? "?"}`;
    })
    .join("\n");
  return `Cotización [id=${quote.id}]
Cliente: ${quote.client.name}${quote.client.phone ? ` · ${quote.client.phone}` : ""}${quote.client.email ? ` · ${quote.client.email}` : ""}
Origen: ${quote.originCity || "—"}
Total: USD ${quote.totalPrice}${quote.finalPrice ? ` · PVP USD ${quote.finalPrice}` : ""}${quote.trm ? ` · TRM ${quote.trm}` : ""}
Estado: ${quote.status}
Mejoras: ${
    quote.selectedUpgrades && Object.keys(quote.selectedUpgrades).length
      ? Object.entries(quote.selectedUpgrades)
          .map(([id, code]) => `${id}=${code}`)
          .join(", ")
      : quote.turkeyUpgrade || quote.italiaUpgrade || quote.granTourUpgrade
        ? `turquia=${quote.turkeyUpgrade || "—"} italia=${quote.italiaUpgrade || "—"} grantour=${quote.granTourUpgrade || "—"}`
        : "ninguna"
  }
Destinos:
${dests || "  (sin destinos)"}`;
}

export async function searchUserClients(user: CosmosNavUser & { id: string }, query: string, limit = 8): Promise<string> {
  const list =
    user.role === ROLES.SUPER_ADMIN ? await storage.listClients() : await storage.listClients(user.id);
  const hay = normalize(query);
  const matched = (hay
    ? list.filter((c) => {
        const blob = normalize(`${c.name} ${c.email} ${c.phone ?? ""}`);
        return blob.includes(hay);
      })
    : list
  ).slice(0, limit);

  if (!matched.length) {
    return hay ? `No encontré clientes para "${query}".` : "No hay clientes registrados.";
  }
  return matched
    .map((c) => `- ${c.name}${c.phone ? ` · ${c.phone}` : ""} · ${c.email} [clientId=${c.id}]`)
    .join("\n");
}

export async function compareCatalogPlans(queries: string[]): Promise<string> {
  const resolved = [];
  for (const q of queries.slice(0, 3)) {
    const plan = await resolveCatalogPlanId(q);
    if (plan) resolved.push(plan);
  }
  if (resolved.length < 2) {
    return "Para comparar necesito al menos dos planes del catálogo.";
  }
  const blocks: string[] = [];
  for (const plan of resolved) {
    const detail = await getPlanDetailText(plan.id);
    blocks.push(detail ?? `${plan.name}: sin detalle.`);
  }
  return `Comparación (${resolved.map((p) => p.name).join(" vs ")}):\n\n${blocks.join("\n\n----\n\n")}`;
}

export async function listBloqueoAvailability(): Promise<string> {
  const catalog = await storage.getDestinations({ isActive: true });
  const bloqueos = catalog.filter((d) => d.isBloqueo);
  if (!bloqueos.length) return "No hay bloqueos activos en el catálogo.";
  return bloqueos
    .map((d) => {
      const cupos = d.bloqueoCuposDisponibles ?? "—";
      const fecha = d.bloqueoSalidaFecha ?? "sin fecha";
      const agotado = d.bloqueoCuposDisponibles != null && d.bloqueoCuposDisponibles <= 0 ? " [AGOTADO]" : "";
      return `- ${d.name} · salida ${fecha} · cupos ${cupos}${agotado} [id=${d.id}]`;
    })
    .join("\n");
}

export async function searchAcademy(user: CosmosNavUser & { id: string }, query: string): Promise<string> {
  if (!canAccessModule(user, USER_MODULES.ACADEMY)) {
    return "No tienes el módulo de Academia digital.";
  }
  const courses = await storage.listPublishedTutorialCoursesForUser(user.id);
  if (!courses.length) return "No hay cursos publicados en la academia.";
  const hay = normalize(query);
  const lines: string[] = [];
  for (const course of courses) {
    const lessons = await storage.listTutorialLessonsByCourse(course.id);
    const published = lessons.filter((l) => l.isPublished);
    const courseHit = !hay || normalize(course.title).includes(hay) || normalize(course.description ?? "").includes(hay);
    const lessonHits = published.filter((l) => hay && normalize(`${l.title} ${l.body}`).includes(hay));
    if (!hay || courseHit || lessonHits.length) {
      lines.push(
        `- ${course.title} [courseId=${course.id}] (${course.completedLessonCount}/${course.publishedLessonCount} lecciones)`
      );
      const show = (courseHit && !hay ? published.slice(0, 4) : lessonHits.slice(0, 4));
      for (const lesson of show) {
        lines.push(`    · ${lesson.title} [lessonId=${lesson.id}]`);
      }
    }
  }
  if (!lines.length) return `No encontré lecciones para "${query}".`;
  return `Academia:\n${lines.join("\n")}`;
}

export async function getAcademyLessonExcerpt(
  user: CosmosNavUser & { id: string },
  courseId: string,
  lessonId?: string
): Promise<string> {
  if (!canAccessModule(user, USER_MODULES.ACADEMY)) {
    return "No tienes el módulo de Academia digital.";
  }
  const payload = await storage.getPublishedCourseWithLessonsForUser(courseId, user.id);
  if (!payload) return "No encontré ese curso publicado.";
  const lesson = lessonId
    ? payload.lessons.find((l) => l.id === lessonId)
    : payload.lessons[0];
  if (!lesson) return "No encontré esa lección.";
  const excerpt = htmlToPlainText(lesson.body).slice(0, 700);
  return `Curso: ${payload.course.title}
Lección: ${lesson.title}
${excerpt}${excerpt.length >= 700 ? "…" : ""}
Ruta: /tutoriales/curso/${payload.course.id}/leccion/${lesson.id}`;
}

export async function estimateQuoteLand(
  queries: string[],
  passengers: number,
  trmSummary: string,
  effectiveTrm: number | null
): Promise<string> {
  const names: string[] = [];
  let land = 0;
  for (const q of queries.slice(0, 6)) {
    const plan = await resolveCatalogPlanId(q);
    if (!plan) continue;
    names.push(plan.name);
    const price = plan.basePrice ? Number(plan.basePrice) : 0;
    if (!Number.isFinite(price)) continue;
    land += price * passengers;
  }
  if (!names.length) return "No pude resolver esos planes para estimar.";
  const cop =
    effectiveTrm && effectiveTrm > 0
      ? ` / COP ${Math.round(land * effectiveTrm).toLocaleString("es-CO")}`
      : "";
  return `Estimado terrestre (precio base × ${passengers} pax, sin vuelos, upgrades ni fees): ${names.join(" + ")} = USD ${land.toLocaleString("en-US")}${cop}.
${trmSummary}
Es una guía, no el PVP final.`;
}

export async function inspectOwnedPlans(user: CosmosNavUser & { id: string }): Promise<string> {
  if (user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.PROVIDER) {
    return "Solo un proveedor o administrador puede revisar el inventario de planes.";
  }
  const dests =
    user.role === ROLES.PROVIDER
      ? await storage.getDestinations({ createdByUserId: user.id })
      : await storage.getDestinations();
  if (!dests.length) return "No hay planes para revisar.";

  const counts = await db
    .select({
      destinationId: itineraryDays.destinationId,
      days: sql<number>`count(*)::int`,
    })
    .from(itineraryDays)
    .groupBy(itineraryDays.destinationId);
  const byId = new Map(counts.map((c) => [c.destinationId, Number(c.days)]));

  const issues = dests.filter((d) => !d.basePrice || (byId.get(d.id) ?? 0) === 0 || !d.isActive);
  const lines = dests.slice(0, 20).map((d) => {
    const flags = [
      d.isActive ? null : "inactivo",
      d.basePrice ? null : "sin precio",
      (byId.get(d.id) ?? 0) === 0 ? "sin itinerario" : null,
    ].filter(Boolean);
    return `- ${d.name} (${d.country})${flags.length ? ` [${flags.join(", ")}]` : ""} [id=${d.id}]`;
  });
  const header =
    issues.length > 0
      ? `${dests.length} planes. ${issues.length} con algo pendiente (inactivo, sin precio o sin itinerario).`
      : `${dests.length} planes. No vi huecos evidentes de precio/itinerario en el recorte.`;
  return `${header}\n${lines.join("\n")}`;
}
