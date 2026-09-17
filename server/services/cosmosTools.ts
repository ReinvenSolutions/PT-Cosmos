import type { CosmosClientAction, CosmosExecutableAction, CosmosQuotePatch, CosmosScreenContext } from "@shared/cosmosAgent";
import { cosmosQuotePatchSchema, parseCosmosCaseBrief } from "@shared/cosmosAgent";
import { isKnownHighlightTarget, resolveCosmosNavigation, type CosmosNavUser } from "@shared/cosmosNavigation";
import { formatCosmosQuoteValidation, validateCosmosQuoteDraft } from "@shared/cosmosQuoteRules";
import {
  formatUpgradeChoices,
  matchPlanUpgrade,
  upgradesForPlan,
  type CosmosPlanUpgrade,
} from "@shared/cosmosQuoteUpgrades";
import { ROLES } from "@shared/roles";
import type { Destination } from "@shared/schema";
import {
  getActiveCatalog,
  getPlanDetailText,
  getTrmSummary,
  resolveCatalogPlanId,
  searchCatalogPlans,
} from "./cosmosKnowledge";
import {
  compareCatalogPlans,
  estimateQuoteLand,
  getAcademyLessonExcerpt,
  getUserQuoteDetail,
  inspectOwnedPlans,
  listBloqueoAvailability,
  searchAcademy,
  searchUserClients,
  searchUserQuotes,
} from "./cosmosCopilot";
import {
  applyAdminMutation,
  getAdvisorQuoteStats,
  getDashboardSummary,
  getQuotesTrend,
  getTopDestinationStats,
  getUserAccess,
  previewOrSetPlanActive,
  previewOrSetUserModules,
  requirePlanManager,
  requireSuperAdmin,
  searchAdminUsers,
  searchManagedPlans,
  type CosmosAdminActor,
} from "./cosmosAdmin";
import { getCosmosSessionById, updateCosmosSessionMetadata } from "./cosmosSessionService";
import { storage } from "../storage";
import type { CosmosAdminMutation } from "@shared/cosmosAgent";

export type CosmosToolContext = {
  userId: string;
  userRole: string;
  userName?: string;
  sessionId?: string;
  screen?: CosmosScreenContext;
  enabledModules?: unknown;
  milesProgramsAllowed?: string | null;
};

export type CosmosToolResult = {
  result: string;
  action?: CosmosClientAction;
};

function navUser(ctx?: CosmosToolContext): CosmosNavUser & { id: string } {
  return {
    id: ctx?.userId ?? "",
    role: ctx?.userRole ?? "agency",
    enabledModules: ctx?.enabledModules,
    milesProgramsAllowed: ctx?.milesProgramsAllowed,
  };
}

export const OPENAI_COSMOS_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_plans",
      description: "Busca planes activos del catálogo por nombre, país, ciudad o tema.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Texto de búsqueda del asesor" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_plan_details",
      description: "Itinerario, inclusiones, hoteles y precios de un plan (id o nombre).",
      parameters: {
        type: "object",
        properties: { plan: { type: "string", description: "UUID o nombre del plan" } },
        required: ["plan"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_trm",
      description: "Consulta la TRM base y la TRM efectiva del cotizador (COP por USD).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_plan",
      description:
        "Propone o abre la ficha del plan en pantalla. Por defecto propone; immediate=true si el usuario ya lo pidió o confirmó.",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string", description: "UUID o nombre del plan" },
          immediate: { type: "boolean", description: "true para navegar ya, sin tarjeta de confirmación" },
        },
        required: ["plan"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "start_quote",
      description:
        "Prellena una cotización con uno o más planes y lleva a /cotizacion. Por defecto propone el salto. replace=true limpia el borrador previo (solo tras confirmar una cotización nueva).",
      parameters: {
        type: "object",
        properties: {
          plans: {
            type: "array",
            items: { type: "string" },
            description: "UUIDs o nombres de planes, en el orden de la ruta",
          },
          startDate: { type: "string", description: "YYYY-MM-DD opcional" },
          replace: {
            type: "boolean",
            description: "true para empezar limpio, sin mezclar precios del borrador anterior",
          },
          immediate: { type: "boolean" },
        },
        required: ["plans"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "resume_quote",
      description:
        "Vuelve a la cotización en curso con los datos que ya estaban (fecha, pax, vuelos, PVP, etc.). Úsalo si el asesor está en una ficha u otra pantalla y pide regresar a la cotización. No armes un start_quote para eso.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_quote",
      description:
        "Guarda el borrador de cotización asociado a un cliente. Pide nombre (y correo si es nuevo) si no lo tienes. thenReset=true guarda y luego limpia para una cotización nueva.",
      parameters: {
        type: "object",
        properties: {
          clientId: { type: "string", description: "UUID del cliente si ya lo resolviste" },
          clientName: { type: "string" },
          clientEmail: { type: "string", description: "Obligatorio si el cliente es nuevo" },
          thenReset: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reset_quote",
      description:
        "Descarta el borrador actual y lleva al catálogo para una cotización nueva limpia. Solo si el asesor confirmó no guardar.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "navigate_to",
      description:
        "Propone llevar al asesor a una pantalla de la plataforma (catálogo, cotización, clientes, academia, millas, admin, etc.).",
      parameters: {
        type: "object",
        properties: {
          place: {
            type: "string",
            description:
              "catalog | plan | quote | quote_express | my_quotes | quote_detail | clients | academy | academy_lesson | day_counter | miles | admin_dashboard | admin_plans | admin_plan_new | admin_plan_edit | admin_users | admin_clients | admin_tutorials | admin_cosmos",
          },
          plan: { type: "string", description: "UUID o nombre si place es plan o admin_plan_edit" },
          quoteId: { type: "string" },
          courseId: { type: "string" },
          lessonId: { type: "string" },
          immediate: { type: "boolean" },
        },
        required: ["place"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "highlight_ui",
      description:
        "Señala el input o bloque concreto. Para cotización usa quote.flightsCost, quote.assistanceCost, quote.dates, quote.passengers, quote.origin, quote.pvp, quote.minPayment, quote.filename. Nunca quote.pvp si el cambio no es el PVP.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", description: "Identificador data-cosmos-target, p. ej. quote.dates o plan.inclusions" },
          query: { type: "string", description: "Si target es catalog.search, texto a filtrar" },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "patch_quote",
      description:
        "Actualiza SOLO los campos que el asesor acaba de pedir. No incluyas finalPrice/PVP si no lo pidió. No guarda ni genera PDF.",
      parameters: {
        type: "object",
        properties: {
          plans: { type: "array", items: { type: "string" } },
          startDate: { type: "string", description: "YYYY-MM-DD" },
          passengers: { type: "integer" },
          originCity: { type: "string" },
          flightsCost: { type: "number", description: "Costo de vuelos en la moneda indicada" },
          flightsCurrency: { type: "string", enum: ["USD", "COP"], description: "Moneda del costo de vuelos. Por defecto USD." },
          assistanceCost: { type: "number", description: "Costo de asistencia médica" },
          assistanceCurrency: { type: "string", enum: ["USD", "COP"] },
          finalPrice: { type: "number", description: "Precio final de venta PVP" },
          finalPriceCurrency: { type: "string", enum: ["USD", "COP"] },
          minPayment: { type: "number", description: "Pago mínimo para separar, en la moneda del PVP" },
          minPaymentPercent: {
            type: "integer",
            description: "Si el asesor pide 60/70/100% del PVP, usa este porcentaje en lugar de minPayment",
          },
          customFilename: { type: "string", description: "Nombre del archivo PDF" },
          upgrades: {
            type: "array",
            description:
              "Mejoras a marcar o quitar. plan = UUID o nombre; upgrade/code/name = código o texto de la mejora. Si el plan tiene una sola, basta con el plan. clear=true la desmarca.",
            items: {
              type: "object",
              properties: {
                plan: { type: "string" },
                code: { type: "string" },
                name: { type: "string" },
                upgrade: { type: "string" },
                clear: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "validate_quote_draft",
      description: "Valida reglas de combinación, bloqueos, cupos y días de salida del borrador o de los planes indicados.",
      parameters: {
        type: "object",
        properties: {
          plans: { type: "array", items: { type: "string" } },
          startDate: { type: "string" },
          passengers: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "estimate_quote",
      description: "Estima el terrestre (precio base × pasajeros) y lo pasa a COP con la TRM. No es el PVP final.",
      parameters: {
        type: "object",
        properties: {
          plans: { type: "array", items: { type: "string" } },
          passengers: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_quotes",
      description: "Busca cotizaciones guardadas del asesor por cliente, correo o nombre de plan.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_quote_detail",
      description: "Detalle de una cotización guardada (id UUID).",
      parameters: {
        type: "object",
        properties: { quoteId: { type: "string" } },
        required: ["quoteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_clients",
      description: "Busca clientes del asesor (o todos, si es admin) por nombre, correo o teléfono.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_plans",
      description: "Compara 2 o 3 planes del catálogo (itinerario, precio, inclusiones).",
      parameters: {
        type: "object",
        properties: { plans: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 } },
        required: ["plans"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_bloqueo_availability",
      description: "Lista bloqueos activos con fecha de salida y cupos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_academy",
      description: "Busca cursos y lecciones de la academia digital.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_academy_lesson",
      description: "Lee un extracto de una lección y da la ruta para abrirla.",
      parameters: {
        type: "object",
        properties: {
          courseId: { type: "string" },
          lessonId: { type: "string" },
        },
        required: ["courseId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_case_brief",
      description: "Guarda o actualiza el brief del caso (cliente, fechas, pasajeros, destinos, notas) en esta sesión.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string" },
          clientId: { type: "string" },
          passengers: { type: "integer" },
          budgetUsd: { type: "number" },
          dates: { type: "string" },
          destinations: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_case_brief",
      description: "Lee el brief del caso guardado en esta sesión.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "confirm_pending_action",
      description: "Ejecuta la última navegación o acción que Cosmos propuso, cuando el usuario dice que sí.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inspect_my_plans",
      description: "Proveedor/admin: lista planes propios y marca huecos (sin precio, sin itinerario, inactivo).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_workspace_snapshot",
      description: "Admin: resumen de cotizaciones, usuarios pendientes, planes y cupos de bloqueo. Solo lectura.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_dashboard_stats",
      description:
        "Admin: KPIs del dashboard (cotizaciones, montos USD, ticket promedio, clientes, agencias, planes y sesiones Cosmos), con variación semanal y mensual.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_quote_advisor_stats",
      description: "Admin: cotizaciones guardadas por agencia/asesor (cantidad y monto).",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer", description: "Cuántas agencias mostrar (3-20)" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_top_destinations",
      description: "Admin: destinos más cotizados, por cantidad o por monto.",
      parameters: {
        type: "object",
        properties: {
          sortBy: { type: "string", enum: ["count", "amount"], description: "count = veces cotizado; amount = monto USD" },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_quotes_trend",
      description: "Admin: tendencia de cotizaciones (tracking) en 7, 14, 30 o 90 días.",
      parameters: {
        type: "object",
        properties: { days: { type: "integer", description: "7, 14, 30 o 90. Por defecto 30." } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_admin_users",
      description: "Admin: busca usuarios por nombre, usuario o correo. Filtros: pending, inactive, agency, provider.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          filter: { type: "string", enum: ["all", "pending", "inactive", "agency", "provider"] },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_access",
      description: "Admin: lista los módulos habilitados de un usuario (nombre, correo o id).",
      parameters: {
        type: "object",
        properties: { user: { type: "string", description: "Nombre, username, correo o userId" } },
        required: ["user"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_user_modules",
      description:
        "Admin: enciende o apaga módulos de un usuario (cotización, express, contador, millas, academia, cosmos, voz). Por defecto propone el cambio; confirm=true solo si el admin ya lo pidió o confirmó.",
      parameters: {
        type: "object",
        properties: {
          user: { type: "string" },
          enable: { type: "array", items: { type: "string" }, description: "Módulos a encender" },
          disable: { type: "array", items: { type: "string" }, description: "Módulos a apagar" },
          milesProgramsAllowed: {
            type: "string",
            enum: ["none", "lifemiles", "smiles", "both"],
            description: "Opcional. Si enciendes millas y no se indica, se asume both.",
          },
          confirm: { type: "boolean" },
        },
        required: ["user"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_managed_plans",
      description:
        "Admin/proveedor: busca planes del inventario, incluidos los inactivos. El catálogo público (search_plans) solo muestra activos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          status: { type: "string", enum: ["all", "active", "inactive"] },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_plan_active",
      description:
        "Admin/proveedor: activa o desactiva un plan del inventario. Por defecto propone el cambio; confirm=true si el usuario ya lo pidió o confirmó.",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string", description: "UUID o nombre del plan" },
          active: { type: "boolean", description: "true para publicar en catálogo, false para ocultarlo" },
          confirm: { type: "boolean" },
        },
        required: ["plan", "active"],
      },
    },
  },
];

const SUPER_ADMIN_TOOL_NAMES = new Set([
  "get_workspace_snapshot",
  "get_dashboard_stats",
  "get_quote_advisor_stats",
  "get_top_destinations",
  "get_quotes_trend",
  "search_admin_users",
  "get_user_access",
  "set_user_modules",
]);

const PLAN_MANAGER_TOOL_NAMES = new Set(["inspect_my_plans", "search_managed_plans", "set_plan_active"]);

export function openaiCosmosToolsForRole(role: string) {
  return OPENAI_COSMOS_TOOLS.filter((tool) => {
    const name = tool.function.name;
    if (SUPER_ADMIN_TOOL_NAMES.has(name)) return role === ROLES.SUPER_ADMIN;
    if (PLAN_MANAGER_TOOL_NAMES.has(name)) return role === ROLES.SUPER_ADMIN || role === ROLES.PROVIDER;
    return true;
  });
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
  }
  const single = asString(value);
  return single ? [single] : [];
}

function asBool(value: unknown): boolean {
  return value === true || value === "true";
}

function asDate(value: unknown): CosmosQuotePatch["startDate"] | undefined {
  const text = asString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? (text as CosmosQuotePatch["startDate"]) : undefined;
}

function asInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

function asMoney(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000_000) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[$\s]/g, "").replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 1_000_000_000) return n;
  }
  return undefined;
}

function asCurrency(value: unknown): "USD" | "COP" | undefined {
  const text = asString(value).toUpperCase().replace(/\$/g, "");
  if (text === "USD" || text === "DOLAR" || text === "DOLARES" || text === "DÓLARES") return "USD";
  if (text === "COP" || text === "PESO" || text === "PESOS") return "COP";
  return undefined;
}

function fillQuoteMoneyPatch(args: Record<string, unknown>, patch: CosmosQuotePatch) {
  const flightsCost = asMoney(args.flightsCost);
  const assistanceCost = asMoney(args.assistanceCost);
  const finalPrice = asMoney(args.finalPrice ?? args.pvp);
  const minPayment = asMoney(args.minPayment);
  const minPaymentPercent = asInt(args.minPaymentPercent);
  const flightsCurrency = asCurrency(args.flightsCurrency);
  const assistanceCurrency = asCurrency(args.assistanceCurrency);
  const finalPriceCurrency = asCurrency(args.finalPriceCurrency);
  const customFilename = asString(args.customFilename) || asString(args.filename);
  if (flightsCost != null) patch.flightsCost = flightsCost;
  if (flightsCurrency) patch.flightsCurrency = flightsCurrency;
  if (assistanceCost != null) patch.assistanceCost = assistanceCost;
  if (assistanceCurrency) patch.assistanceCurrency = assistanceCurrency;
  if (finalPrice != null) patch.finalPrice = finalPrice;
  if (finalPriceCurrency) patch.finalPriceCurrency = finalPriceCurrency;
  if (minPayment != null) patch.minPayment = minPayment;
  if (minPaymentPercent != null && minPaymentPercent >= 1 && minPaymentPercent <= 100) {
    patch.minPaymentPercent = minPaymentPercent;
  }
  if (customFilename) patch.customFilename = customFilename.slice(0, 120);
}

function describeQuotePatch(patch: CosmosQuotePatch): string {
  const bits = [
    patch.planIds?.length ? `${patch.planIds.length} plan(es)` : null,
    patch.startDate ? `fecha ${patch.startDate}` : null,
    patch.passengers ? `${patch.passengers} pax` : null,
    patch.originCity ? `origen ${patch.originCity}` : null,
    patch.flightsCost != null
      ? `vuelos ${patch.flightsCurrency ?? "USD"} ${patch.flightsCost}`
      : null,
    patch.assistanceCost != null
      ? `asistencia ${patch.assistanceCurrency ?? "USD"} ${patch.assistanceCost}`
      : null,
    patch.finalPrice != null
      ? `PVP ${patch.finalPriceCurrency ?? "USD"} ${patch.finalPrice}`
      : null,
    patch.minPayment != null
      ? `pago mínimo ${patch.finalPriceCurrency ?? "USD"} ${patch.minPayment}`
      : null,
    patch.minPaymentPercent != null ? `pago mínimo ${patch.minPaymentPercent}% del PVP` : null,
    patch.customFilename ? `archivo "${patch.customFilename}"` : null,
    patch.selectedUpgrades
      ? Object.entries(patch.selectedUpgrades)
          .map(([planId, code]) => (code ? `mejora ${code} en ${planId}` : `sin mejora en ${planId}`))
          .join("; ")
      : null,
  ].filter(Boolean);
  return bits.join(", ");
}

type UpgradeToolArg = {
  plan?: unknown;
  code?: unknown;
  name?: unknown;
  upgrade?: unknown;
  clear?: unknown;
};

function parseUpgradeToolArgs(args: Record<string, unknown>): UpgradeToolArg[] {
  if (Array.isArray(args.upgrades)) {
    return args.upgrades.filter((item): item is UpgradeToolArg => !!item && typeof item === "object");
  }
  if (args.selectedUpgrades && typeof args.selectedUpgrades === "object" && !Array.isArray(args.selectedUpgrades)) {
    return Object.entries(args.selectedUpgrades as Record<string, unknown>).map(([plan, code]) => ({
      plan,
      code,
    }));
  }
  const upgrade = asString(args.upgrade) || asString(args.upgradeCode) || asString(args.upgradeName);
  const plan = asString(args.plan) || asString(args.upgradePlan);
  if (upgrade || plan || args.clearUpgrade === true) {
    return [
      {
        plan,
        code: asString(args.upgradeCode) || asString(args.code),
        name: asString(args.upgradeName) || asString(args.name),
        upgrade,
        clear: args.clearUpgrade,
      },
    ];
  }
  return [];
}

function upgradeQueryOf(item: UpgradeToolArg): string {
  return asString(item.upgrade) || asString(item.code) || asString(item.name);
}

async function resolveUpgradeSelections(
  items: UpgradeToolArg[],
  ctx: CosmosToolContext | undefined,
  alreadyResolvedPlanIds: string[]
): Promise<{ selected: Record<string, string>; errors: string[]; labels: string[] }> {
  const catalog = await getActiveCatalog();
  const draftIds = ctx?.screen?.quoteDraft?.planIds ?? [];
  const selected: Record<string, string> = {};
  const errors: string[] = [];
  const labels: string[] = [];

  const destById = (id: string) => catalog.find((d) => d.id === id);

  const searchPool = (preferred: Destination[]) => {
    const seen = new Set(preferred.map((d) => d.id));
    const extra = [...alreadyResolvedPlanIds, ...draftIds]
      .map((id) => destById(id))
      .filter((d): d is Destination => !!d && !seen.has(d.id));
    return [...preferred, ...extra];
  };

  for (const item of items.slice(0, 6)) {
    const planQuery = asString(item.plan);
    const query = upgradeQueryOf(item);
    const clear = asBool(item.clear);
    let dest: Destination | undefined;

    if (planQuery) {
      const resolved = await resolveCatalogPlanId(planQuery);
      dest = resolved ? destById(resolved.id) : undefined;
      if (!dest) {
        errors.push(`No encontré el plan "${planQuery}" para la mejora.`);
        continue;
      }
    } else {
      const pool = searchPool([]);
      const withUpgrades = pool.filter((p) => upgradesForPlan(p).length > 0);
      if (query) {
        const hits = withUpgrades
          .map((p) => ({ plan: p, upgrade: matchPlanUpgrade(upgradesForPlan(p), query) }))
          .filter((h): h is { plan: Destination; upgrade: CosmosPlanUpgrade } => !!h.upgrade);
        if (hits.length === 1) dest = hits[0].plan;
      }
      if (!dest && withUpgrades.length === 1) dest = withUpgrades[0];
      if (!dest) {
        if (!withUpgrades.length) {
          errors.push("No hay un plan con mejoras en el borrador. Indica el plan.");
        } else {
          errors.push(
            `Hay varias mejoras posibles. Indica el plan y la opción: ${withUpgrades
              .map((p) => `${p.name}: ${formatUpgradeChoices(upgradesForPlan(p))}`)
              .join(" | ")}`
          );
        }
        continue;
      }
    }

    const available = upgradesForPlan(dest);
    if (!available.length) {
      errors.push(`${dest.name} no tiene mejoras configuradas.`);
      continue;
    }

    if (clear) {
      selected[dest.id] = "";
      labels.push(`quité la mejora de ${dest.name}`);
      continue;
    }

    const matched = matchPlanUpgrade(available, query);
    if (!matched) {
      errors.push(
        `No identifiqué esa mejora en ${dest.name}. Opciones: ${formatUpgradeChoices(available)}`
      );
      continue;
    }

    selected[dest.id] = matched.code;
    labels.push(`${dest.name}: ${matched.name} (USD ${matched.price})`);
  }

  return { selected, errors, labels };
}

async function maybePropose(
  ctx: CosmosToolContext | undefined,
  immediate: boolean,
  label: string,
  action: CosmosExecutableAction,
  doneText: string
): Promise<CosmosToolResult> {
  if (immediate) return { result: doneText, action };
  const proposal: CosmosClientAction = { type: "propose_action", label, action };
  if (ctx?.sessionId) {
    await updateCosmosSessionMetadata(ctx.sessionId, { lastProposal: proposal });
  }
  return {
    result: `${doneText} Propón el salto y espera confirmación; no digas que ya cambiaste de pantalla.`,
    action: proposal,
  };
}

function adminActor(ctx?: CosmosToolContext): CosmosAdminActor {
  return { id: ctx?.userId ?? "", role: ctx?.userRole ?? "agency" };
}

async function proposeAdminMutation(
  ctx: CosmosToolContext | undefined,
  confirm: boolean,
  preview: string,
  mutation: CosmosAdminMutation
): Promise<CosmosToolResult> {
  if (confirm) {
    const applied = await applyAdminMutation(adminActor(ctx), mutation);
    if (ctx?.sessionId) {
      await updateCosmosSessionMetadata(ctx.sessionId, { lastAdminMutation: null, lastProposal: null });
    }
    return applied;
  }
  if (ctx?.sessionId) {
    await updateCosmosSessionMetadata(ctx.sessionId, {
      lastAdminMutation: mutation,
      lastProposal: null,
    });
  }
  return {
    result: `${preview}\nPide confirmación. Si acepta, llama confirm_pending_action o esta misma herramienta con confirm=true. No digas que ya lo aplicaste.`,
  };
}

async function resolvePlanIds(queries: string[]): Promise<{ ids: string[]; names: string[] }> {
  const ids: string[] = [];
  const names: string[] = [];
  for (const q of queries.slice(0, 6)) {
    const resolved = await resolveCatalogPlanId(q);
    if (resolved) {
      ids.push(resolved.id);
      names.push(resolved.name);
    }
  }
  return { ids, names };
}

function hasActiveQuoteDraft(ctx?: CosmosToolContext): boolean {
  return (ctx?.screen?.quoteDraft?.planIds?.length ?? 0) > 0;
}

function normalizeClientHay(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveClientForSave(
  ctx: CosmosToolContext | undefined,
  args: Record<string, unknown>
): Promise<
  | { error: string }
  | { clientId: string; clientName: string }
  | { clientName: string; clientEmail: string }
> {
  if (!ctx?.userId) return { error: "No pude identificar al usuario para guardar." };
  const list =
    ctx.userRole === ROLES.SUPER_ADMIN ? await storage.listClients() : await storage.listClients(ctx.userId);
  const brief = ctx.sessionId
    ? parseCosmosCaseBrief(
        ((await getCosmosSessionById(ctx.sessionId))?.metadata as Record<string, unknown> | null)?.brief
      )
    : null;
  const clientId = asString(args.clientId) || brief?.clientId || "";
  if (clientId) {
    const found = list.find((c) => c.id === clientId);
    if (found) return { clientId: found.id, clientName: found.name };
    return { error: "No encontré ese cliente en tu lista." };
  }
  const name = asString(args.clientName) || brief?.clientName || "";
  const email = asString(args.clientEmail);
  if (email) {
    const byEmail = list.filter((c) => normalizeClientHay(c.email) === normalizeClientHay(email));
    if (byEmail.length === 1) return { clientId: byEmail[0].id, clientName: byEmail[0].name };
  }
  if (name) {
    const hay = normalizeClientHay(name);
    const matched = list.filter(
      (c) => normalizeClientHay(c.name).includes(hay) || normalizeClientHay(c.email) === hay
    );
    if (matched.length === 1) return { clientId: matched[0].id, clientName: matched[0].name };
    if (matched.length > 1) {
      return {
        error: `Hay varios clientes: ${matched
          .slice(0, 6)
          .map((c) => `${c.name} (${c.email}) [clientId=${c.id}]`)
          .join("; ")}. Indica cuál.`,
      };
    }
    if (email) return { clientName: name, clientEmail: email };
    return { error: `No encontré a "${name}". Si es un cliente nuevo, dame también el correo.` };
  }
  return { error: "¿A nombre de qué cliente la guardo? Si es nuevo, dime nombre y correo." };
}

async function plansForValidation(queries: string[]) {
  const out = [];
  for (const q of queries.slice(0, 6)) {
    const resolved = await resolveCatalogPlanId(q);
    if (!resolved) continue;
    const dest = await storage.getDestination(resolved.id);
    if (dest) out.push(dest);
  }
  return out;
}

export async function executeCosmosTool(
  name: string,
  args: Record<string, unknown>,
  ctx?: CosmosToolContext
): Promise<CosmosToolResult> {
  switch (name) {
    case "search_plans": {
      const query = asString(args.query);
      if (!query) return { result: "Indica un término de búsqueda." };
      const plans = await searchCatalogPlans(query, 8);
      if (!plans.length) return { result: `No encontré planes activos para "${query}".` };
      const lines = plans.map(
        (p) =>
          `- ${p.name} (${p.country}) [id=${p.id}] — ${p.duration}d/${p.nights}n — USD ${p.basePrice ?? "?"}${p.isBloqueo ? " [bloqueo]" : ""}${p.isPromotion ? " [promo]" : ""}`
      );
      return { result: `Planes encontrados:\n${lines.join("\n")}` };
    }
    case "get_plan_details": {
      const planQuery = asString(args.plan) || asString(args.planId);
      const resolved = await resolveCatalogPlanId(planQuery);
      if (!resolved) return { result: `No encontré el plan "${planQuery}".` };
      const detail = await getPlanDetailText(resolved.id);
      return { result: detail ?? `No pude cargar el detalle de ${resolved.name}.` };
    }
    case "get_trm": {
      const trm = await getTrmSummary();
      return { result: trm.summary };
    }
    case "open_plan": {
      const planQuery = asString(args.plan) || asString(args.planId);
      const resolved = await resolveCatalogPlanId(planQuery);
      if (!resolved) return { result: `No encontré el plan "${planQuery}" para abrirlo.` };
      return maybePropose(
        ctx,
        asBool(args.immediate),
        `Abrir ficha de ${resolved.name}`,
        { type: "open_plan", planId: resolved.id },
        `Listo para abrir la ficha de ${resolved.name} (${resolved.country}).`
      );
    }
    case "start_quote": {
      const queries = asStringArray(args.plans).length ? asStringArray(args.plans) : asStringArray(args.planIds);
      if (!queries.length) return { result: "Indica al menos un plan para cotizar." };
      const { ids, names } = await resolvePlanIds(queries);
      if (!ids.length) return { result: "No pude resolver esos planes para armar la cotización." };
      const startDate = asDate(args.startDate);
      const replace = asBool(args.replace);
      const action: CosmosExecutableAction = {
        type: "start_quote",
        planIds: ids,
        ...(startDate ? { startDate } : {}),
        ...(replace ? { replace: true } : {}),
      };
      return maybePropose(
        ctx,
        asBool(args.immediate),
        replace ? `Nueva cotización: ${names.join(", ")}` : `Armar cotización: ${names.join(", ")}`,
        action,
        replace
          ? `Empiezo un borrador limpio con: ${names.join(", ")}.`
          : `Prellené el borrador con: ${names.join(", ")}.`
      );
    }
    case "resume_quote": {
      if (!hasActiveQuoteDraft(ctx)) {
        return {
          result:
            "No hay un borrador de cotización para retomar. Si quieres armar una, dime el destino y uso start_quote.",
        };
      }
      return {
        result: "Te llevo a la cotización con los datos que ya teníamos (planes, fechas, pax, costos y PVP).",
        action: { type: "navigate", path: "/cotizacion", title: "Cotización" },
      };
    }
    case "save_quote": {
      if (!hasActiveQuoteDraft(ctx)) {
        return { result: "No hay un borrador de cotización para guardar." };
      }
      if (!ctx?.screen?.quoteDraft?.startDate) {
        return { result: "Falta la fecha de inicio en el borrador. Pídela y usa patch_quote antes de guardar." };
      }
      const resolved = await resolveClientForSave(ctx, args);
      if ("error" in resolved) return { result: resolved.error };
      const thenReset = asBool(args.thenReset);
      const action: CosmosExecutableAction =
        "clientId" in resolved
          ? {
              type: "save_quote",
              clientId: resolved.clientId,
              clientName: resolved.clientName,
              thenReset,
            }
          : {
              type: "save_quote",
              clientName: resolved.clientName,
              clientEmail: resolved.clientEmail,
              thenReset,
            };
      return {
        result: thenReset
          ? `Guardo la cotización de ${resolved.clientName} y luego empezamos una nueva limpia.`
          : `Guardo la cotización de ${resolved.clientName}.`,
        action,
      };
    }
    case "reset_quote": {
      return {
        result: "Descarto el borrador y te llevo al catálogo para una cotización nueva limpia.",
        action: { type: "reset_quote" },
      };
    }
    case "navigate_to": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario para navegar." };
      const place = asString(args.place);
      let planId = asString(args.planId);
      const planQuery = asString(args.plan);
      if (!planId && planQuery) {
        const resolved = await resolveCatalogPlanId(planQuery);
        planId = resolved?.id ?? "";
      }
      const nav = resolveCosmosNavigation(place, navUser(ctx), {
        planId: planId || undefined,
        quoteId: asString(args.quoteId) || undefined,
        courseId: asString(args.courseId) || undefined,
        lessonId: asString(args.lessonId) || undefined,
      });
      if (!nav.ok) return { result: nav.error };
      const onPlan = ctx.screen?.path?.startsWith("/plan/") ?? false;
      const resumeQuote = place === "quote" && hasActiveQuoteDraft(ctx);
      const immediate = asBool(args.immediate) || (resumeQuote && onPlan);
      return maybePropose(
        ctx,
        immediate,
        resumeQuote ? "Volver a la cotización en curso" : `Ir a ${nav.title}`,
        { type: "navigate", path: nav.path, title: nav.title },
        resumeQuote
          ? `Te llevo a la cotización con los datos que ya teníamos (${nav.path}).`
          : `Puedo llevarte a ${nav.title} (${nav.path}).`
      );
    }
    case "highlight_ui": {
      const target = asString(args.target);
      if (!isKnownHighlightTarget(target)) {
        return { result: `No reconozco el bloque "${target}" para señalarlo.` };
      }
      const query = asString(args.query) || undefined;
      return {
        result: query
          ? `Señalo ${target} y filtro "${query}".`
          : `Señalo el bloque ${target} en pantalla.`,
        action: query ? { type: "highlight", target, query } : { type: "highlight", target },
      };
    }
    case "patch_quote": {
      const queries = asStringArray(args.plans).length
        ? asStringArray(args.plans)
        : asStringArray(args.planIds);
      const patch: CosmosQuotePatch = {};
      let planNames: string[] = [];
      if (queries.length) {
        const { ids, names } = await resolvePlanIds(queries);
        if (!ids.length) return { result: "No pude resolver esos planes para el borrador." };
        patch.planIds = ids;
        planNames = names;
      }
      const startDate = asDate(args.startDate);
      const passengers = asInt(args.passengers);
      const originCity = asString(args.originCity) || undefined;
      if (startDate) patch.startDate = startDate;
      if (passengers) patch.passengers = passengers;
      if (originCity) patch.originCity = originCity;
      fillQuoteMoneyPatch(args, patch);
      const upgradeArgs = parseUpgradeToolArgs(args);
      const upgradeNotes: string[] = [];
      if (upgradeArgs.length) {
        const resolvedUpgrades = await resolveUpgradeSelections(upgradeArgs, ctx, patch.planIds ?? []);
        upgradeNotes.push(...resolvedUpgrades.errors);
        if (Object.keys(resolvedUpgrades.selected).length) {
          patch.selectedUpgrades = resolvedUpgrades.selected;
          const draftIds = ctx?.screen?.quoteDraft?.planIds ?? [];
          const currentIds = patch.planIds ?? draftIds;
          const missing = Object.keys(resolvedUpgrades.selected).filter((id) => !currentIds.includes(id));
          if (missing.length) {
            patch.planIds = [...currentIds, ...missing];
          }
          if (resolvedUpgrades.labels.length) {
            upgradeNotes.push(`Mejora aplicada: ${resolvedUpgrades.labels.join("; ")}.`);
          }
        }
      }
      const parsedPatch = cosmosQuotePatchSchema.safeParse(patch);
      if (!parsedPatch.success || !Object.keys(parsedPatch.data).length) {
        return {
          result:
            upgradeNotes.join(" ") ||
            "Indica qué cambiar en el borrador (planes, fecha, pasajeros, ciudad, vuelos, asistencia, PVP, pago mínimo, nombre de archivo o una mejora).",
        };
      }
      const summary = describeQuotePatch(parsedPatch.data);
      const extra = upgradeNotes.length ? ` ${upgradeNotes.join(" ")}` : "";
      return {
        result: planNames.length
          ? `Actualicé el borrador con ${planNames.join(", ")}${summary ? ` (${summary})` : ""}.${extra}`
          : `Actualicé el borrador (${summary}).${extra}`,
        action: { type: "patch_quote", patch: parsedPatch.data },
      };
    }
    case "validate_quote_draft": {
      const queries = asStringArray(args.plans);
      const fromScreen = ctx?.screen?.quoteDraft?.planIds ?? [];
      const source = queries.length ? queries : fromScreen;
      if (!source.length) return { result: "No hay planes en el borrador para validar." };
      const plans = await plansForValidation(source);
      if (!plans.length) return { result: "No pude cargar esos planes para validarlos." };
      const startDate = asString(args.startDate) || ctx?.screen?.quoteDraft?.startDate;
      const passengers = asInt(args.passengers) ?? ctx?.screen?.quoteDraft?.passengers;
      const result = validateCosmosQuoteDraft(plans, { startDate, passengers });
      return { result: formatCosmosQuoteValidation(result) };
    }
    case "estimate_quote": {
      const queries = asStringArray(args.plans);
      const fromScreen = ctx?.screen?.quoteDraft?.planIds ?? [];
      const source = queries.length ? queries : fromScreen;
      if (!source.length) return { result: "Indica planes o ábrelo desde un borrador." };
      const passengers = asInt(args.passengers) ?? ctx?.screen?.quoteDraft?.passengers ?? 1;
      const trm = await getTrmSummary();
      const text = await estimateQuoteLand(source, Math.max(1, passengers), trm.summary, trm.effectiveTrm);
      return { result: text };
    }
    case "search_quotes": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      return { result: await searchUserQuotes(ctx.userId, asString(args.query)) };
    }
    case "get_quote_detail": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      const quoteId = asString(args.quoteId);
      if (!quoteId) return { result: "Indica el id de la cotización." };
      return { result: await getUserQuoteDetail(ctx.userId, quoteId) };
    }
    case "search_clients": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      return { result: await searchUserClients(navUser(ctx), asString(args.query)) };
    }
    case "compare_plans": {
      const queries = asStringArray(args.plans);
      if (queries.length < 2) return { result: "Indica al menos dos planes para comparar." };
      return { result: await compareCatalogPlans(queries) };
    }
    case "get_bloqueo_availability":
      return { result: await listBloqueoAvailability() };
    case "search_academy": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      return { result: await searchAcademy(navUser(ctx), asString(args.query)) };
    }
    case "get_academy_lesson": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      return {
        result: await getAcademyLessonExcerpt(
          navUser(ctx),
          asString(args.courseId),
          asString(args.lessonId) || undefined
        ),
      };
    }
    case "update_case_brief": {
      if (!ctx?.sessionId) return { result: "No hay sesión para guardar el brief." };
      const session = await getCosmosSessionById(ctx.sessionId);
      const prev = parseCosmosCaseBrief((session?.metadata as Record<string, unknown> | null)?.brief) ?? {};
      const next = {
        ...prev,
        ...(asString(args.clientName) ? { clientName: asString(args.clientName) } : {}),
        ...(asString(args.clientId) ? { clientId: asString(args.clientId) } : {}),
        ...(asInt(args.passengers) ? { passengers: asInt(args.passengers) } : {}),
        ...(typeof args.budgetUsd === "number" ? { budgetUsd: args.budgetUsd } : {}),
        ...(asString(args.dates) ? { dates: asString(args.dates) } : {}),
        ...(asStringArray(args.destinations).length ? { destinations: asStringArray(args.destinations) } : {}),
        ...(asString(args.notes) ? { notes: asString(args.notes) } : {}),
      };
      await updateCosmosSessionMetadata(ctx.sessionId, { brief: next });
      return { result: `Brief actualizado: ${JSON.stringify(next)}` };
    }
    case "get_case_brief": {
      if (!ctx?.sessionId) return { result: "No hay sesión activa." };
      const session = await getCosmosSessionById(ctx.sessionId);
      const brief = parseCosmosCaseBrief((session?.metadata as Record<string, unknown> | null)?.brief);
      if (!brief || !Object.keys(brief).length) return { result: "Todavía no hay brief en esta sesión." };
      return { result: `Brief del caso: ${JSON.stringify(brief)}` };
    }
    case "confirm_pending_action": {
      if (!ctx?.sessionId) return { result: "No hay una propuesta pendiente." };
      const session = await getCosmosSessionById(ctx.sessionId);
      const meta = (session?.metadata as Record<string, unknown> | null) ?? {};
      if (meta.lastAdminMutation) {
        const applied = await applyAdminMutation(adminActor(ctx), meta.lastAdminMutation);
        await updateCosmosSessionMetadata(ctx.sessionId, { lastAdminMutation: null });
        return applied;
      }
      const last = meta.lastProposal;
      if (!last || typeof last !== "object") {
        return { result: "No tengo una navegación pendiente para confirmar." };
      }
      const proposal = last as CosmosClientAction;
      if (proposal.type === "propose_action") {
        return { result: `Confirmado: ${proposal.label}.`, action: proposal.action };
      }
      return { result: "Confirmé la acción pendiente.", action: proposal };
    }
    case "inspect_my_plans": {
      if (!ctx?.userId) return { result: "No pude identificar al usuario." };
      return { result: await inspectOwnedPlans(navUser(ctx)) };
    }
    case "get_workspace_snapshot":
    case "get_dashboard_stats": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      return { result: await getDashboardSummary() };
    }
    case "get_quote_advisor_stats": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      return { result: await getAdvisorQuoteStats(asInt(args.limit) ?? 12) };
    }
    case "get_top_destinations": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      const sortBy = asString(args.sortBy) === "amount" ? "amount" : "count";
      return { result: await getTopDestinationStats(sortBy, asInt(args.limit) ?? 8) };
    }
    case "get_quotes_trend": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      return { result: await getQuotesTrend(asInt(args.days) ?? 30) };
    }
    case "search_admin_users": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      const filter = asString(args.filter);
      return {
        result: await searchAdminUsers(
          asString(args.query),
          filter && filter !== "all" ? filter : undefined,
          asInt(args.limit) ?? 10
        ),
      };
    }
    case "get_user_access": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      const userQuery = asString(args.user) || asString(args.query);
      if (!userQuery) return { result: "Indica el nombre, correo o id del usuario." };
      return { result: await getUserAccess(userQuery) };
    }
    case "set_user_modules": {
      const denied = requireSuperAdmin(adminActor(ctx));
      if (denied) return { result: denied };
      const userQuery = asString(args.user) || asString(args.query);
      if (!userQuery) return { result: "Indica el usuario al que cambiarle los módulos." };
      const prepared = await previewOrSetUserModules({
        query: userQuery,
        enable: asStringArray(args.enable),
        disable: asStringArray(args.disable),
        milesProgramsAllowed: asString(args.milesProgramsAllowed) || undefined,
      });
      if ("error" in prepared) return { result: prepared.error };
      return proposeAdminMutation(ctx, asBool(args.confirm), prepared.preview, prepared.mutation);
    }
    case "search_managed_plans": {
      const denied = requirePlanManager(adminActor(ctx));
      if (denied) return { result: denied };
      const statusRaw = asString(args.status);
      const status =
        statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
      return {
        result: await searchManagedPlans(
          adminActor(ctx),
          asString(args.query),
          status,
          asInt(args.limit) ?? 10
        ),
      };
    }
    case "set_plan_active": {
      const denied = requirePlanManager(adminActor(ctx));
      if (denied) return { result: denied };
      const planQuery = asString(args.plan) || asString(args.planId);
      const active = args.active ?? args.isActive;
      if (active !== true && active !== false && active !== "true" && active !== "false") {
        return { result: "Indica si el plan debe quedar activo (true) o inactivo (false)." };
      }
      const prepared = await previewOrSetPlanActive({
        actor: adminActor(ctx),
        plan: planQuery,
        isActive: asBool(active),
        screenPlanId: ctx?.screen?.planId,
      });
      if ("error" in prepared) return { result: prepared.error };
      return proposeAdminMutation(ctx, asBool(args.confirm), prepared.preview, prepared.mutation);
    }
    default:
      return { result: `Herramienta desconocida: ${name}` };
  }
}
