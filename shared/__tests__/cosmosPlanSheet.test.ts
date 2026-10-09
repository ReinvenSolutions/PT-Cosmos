import { describe, expect, it } from "vitest";
import {
  parsePlanSheetIntent,
  rememberOpenedPlan,
  resolvePlanSheetTurnFromCatalog,
} from "../cosmosPlanSheet";

const egipto = "11111111-1111-4111-8111-111111111111";
const turquia = "22222222-2222-4222-8222-222222222222";
const dubai = "33333333-3333-4333-8333-333333333333";

const catalog = [
  { id: egipto, name: "Egipto Clásico", country: "Egipto" },
  { id: turquia, name: "Turquía Esencial", country: "Turquía" },
  { id: dubai, name: "Dubái y Abu Dhabi", country: "Emiratos" },
];

describe("parsePlanSheetIntent", () => {
  it("trata plan, programa, ficha técnica e itinerario como la ficha", () => {
    expect(parsePlanSheetIntent("llevame al plan")).toMatchObject({ type: "open", query: null });
    expect(parsePlanSheetIntent("oye cosmos, llévame al plan")).toMatchObject({ type: "open", query: null });
    expect(parsePlanSheetIntent("muéstrame el plan")).toMatchObject({ type: "open", query: null });
    expect(parsePlanSheetIntent("muetsrame el programa")).toMatchObject({ type: "open", query: null });
    expect(parsePlanSheetIntent("llévame a la ficha técnica")).toMatchObject({ type: "open", query: null });
    expect(parsePlanSheetIntent("muéstrame el itinerario")).toMatchObject({
      type: "open",
      query: null,
      focus: "itinerary",
    });
  });

  it("saca el programa nombrado", () => {
    expect(parsePlanSheetIntent("muéstrame el itinerario de egipto")).toMatchObject({
      type: "open",
      query: "egipto",
      focus: "itinerary",
    });
    expect(parsePlanSheetIntent("abre la ficha técnica del programa de dubai")).toMatchObject({
      type: "open",
      query: "dubai",
    });
    expect(parsePlanSheetIntent("llevame al plan de turquia esencial")).toMatchObject({
      type: "open",
      query: "turquia esencial",
    });
  });

  it("no abre la ficha si preguntan el contenido", () => {
    expect(parsePlanSheetIntent("qué incluye el itinerario de egipto")).toBeNull();
    expect(parsePlanSheetIntent("cuánto cuesta el plan")).toBeNull();
    expect(parsePlanSheetIntent("háblame de las actividades del programa")).toBeNull();
  });

  it("volver a la cotización no es volver a la ficha", () => {
    expect(parsePlanSheetIntent("regresa a la cotización")).toBeNull();
    expect(parsePlanSheetIntent("volvamos a la cotización")).toBeNull();
  });

  it("regresa a la ficha anterior", () => {
    expect(parsePlanSheetIntent("regresa")).toEqual({ type: "back" });
    expect(parsePlanSheetIntent("vuelve")).toEqual({ type: "back" });
    expect(parsePlanSheetIntent("llévame de vuelta")).toEqual({ type: "back" });
    expect(parsePlanSheetIntent("regresa al plan anterior")).toEqual({ type: "back" });
    expect(parsePlanSheetIntent("vuelve a la ficha")).toEqual({ type: "back" });
  });

  it("regresar a otro programa abre esa ficha", () => {
    expect(parsePlanSheetIntent("regresa al plan de egipto")).toMatchObject({
      type: "open",
      query: "egipto",
    });
    expect(parsePlanSheetIntent("llevame a otro programa")).toMatchObject({
      type: "open",
      other: true,
      query: null,
    });
  });
});

describe("rememberOpenedPlan", () => {
  it("apila la ficha actual y desapila al volver", () => {
    const afterB = rememberOpenedPlan([], egipto, turquia);
    expect(afterB).toEqual([egipto]);
    const afterC = rememberOpenedPlan(afterB, turquia, dubai);
    expect(afterC).toEqual([egipto, turquia]);
    const back = rememberOpenedPlan(afterC, dubai, turquia);
    expect(back).toEqual([egipto]);
  });
});

describe("resolvePlanSheetTurnFromCatalog", () => {
  it("abre la ficha del programa nombrado", () => {
    const turn = resolvePlanSheetTurnFromCatalog("muéstrame el itinerario de egipto", undefined, catalog);
    expect(turn?.action).toEqual({ type: "open_plan", planId: egipto });
    expect(turn?.reply).toMatch(/ficha técnica de Egipto Clásico/);
  });

  it("desde una ficha abre la otra y luego regresa", () => {
    const gone = resolvePlanSheetTurnFromCatalog(
      "llevame al programa de turquia",
      { path: `/plan/${egipto}`, planId: egipto },
      catalog
    );
    expect(gone?.action).toEqual({ type: "open_plan", planId: turquia });
    expect(gone?.screenPatch?.planSheetHistory).toEqual([egipto]);

    const back = resolvePlanSheetTurnFromCatalog(
      "regresa",
      {
        path: `/plan/${turquia}`,
        planId: turquia,
        planSheetHistory: gone?.screenPatch?.planSheetHistory,
      },
      catalog
    );
    expect(back?.action).toEqual({ type: "open_plan", planId: egipto });
    expect(back?.reply).toMatch(/Egipto Clásico/);
    expect(back?.screenPatch?.planSheetHistory).toEqual([]);
  });

  it("si ya está en la ficha, señala el itinerario", () => {
    const turn = resolvePlanSheetTurnFromCatalog("muéstrame el itinerario", {
      path: `/plan/${egipto}`,
      planId: egipto,
    }, catalog);
    expect(turn?.action).toEqual({ type: "highlight", target: "plan.itinerary" });
  });

  it("con un solo programa en la cotización abre esa ficha", () => {
    const turn = resolvePlanSheetTurnFromCatalog("llevame al plan", {
      path: "/",
      quoteDraft: { planIds: [dubai] },
    }, catalog);
    expect(turn?.action).toEqual({ type: "open_plan", planId: dubai });
  });

  it("si pide otro programa y hay uno distinto en la cotización, abre ese", () => {
    const turn = resolvePlanSheetTurnFromCatalog("muéstrame otro itinerario", {
      path: `/plan/${egipto}`,
      planId: egipto,
      quoteDraft: { planIds: [egipto, turquia] },
    }, catalog);
    expect(turn?.action).toEqual({ type: "open_plan", planId: turquia });
  });

  it("pregunta cuál programa si hay varios y no dijo el nombre", () => {
    const turn = resolvePlanSheetTurnFromCatalog("llevame a la ficha tecnica", {
      path: "/",
      quoteDraft: { planIds: [egipto, dubai] },
    }, catalog);
    expect(turn?.action).toBeUndefined();
    expect(turn?.reply).toMatch(/Egipto Clásico/);
    expect(turn?.reply).toMatch(/Dubái/);
  });
});
