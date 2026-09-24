import { describe, expect, it } from "vitest";
import {
  clampInternalFlightAfterDay,
  defaultInternalImagesForPlan,
  flattenDomesticImagesByDestination,
  internalFlightPdfHeading,
  buildQuoteFlightUploadSteps,
  planHasInternalFlightSlot,
  planNeedsInternalFlightAfterDay,
  remapDomesticImagesByDestination,
  resolveDomesticImagesForDestination,
  shouldInsertInternalFlightAfterDay,
} from "../internalFlightPlacement";

describe("internalFlightPlacement", () => {
  it("detecta slot interno por flag o por rol domestic en bloqueo", () => {
    expect(planHasInternalFlightSlot({ hasInternalOrConnectionFlight: true })).toBe(true);
    expect(
      planHasInternalFlightSlot({
        isBloqueo: true,
        internalFlights: [{ imageUrl: "https://x/a.jpg", flightRole: "domestic" }],
      }),
    ).toBe(true);
    expect(
      planHasInternalFlightSlot({
        isBloqueo: true,
        internalFlights: [{ imageUrl: "https://x/a.jpg", flightRole: "outbound" }],
      }),
    ).toBe(false);
  });

  it("exige día de inserción cuando hay slot interno", () => {
    expect(planNeedsInternalFlightAfterDay({ hasInternalOrConnectionFlight: true })).toBe(true);
    expect(planNeedsInternalFlightAfterDay({})).toBe(false);
  });

  it("solo prefills imágenes internas de bloqueo; el resto se sube al cotizar", () => {
    expect(
      defaultInternalImagesForPlan({
        internalFlights: [
          { imageUrl: "a.jpg", flightRole: "outbound" },
          { imageUrl: "b.jpg", flightRole: "domestic" },
        ],
      }),
    ).toEqual([]);
    expect(
      defaultInternalImagesForPlan({
        isBloqueo: true,
        internalFlights: [
          { imageUrl: "a.jpg", flightRole: "outbound" },
          { imageUrl: "b.jpg", flightRole: "domestic" },
        ],
      }),
    ).toEqual(["b.jpg"]);
  });

  it("clampa el día de inserción al rango del itinerario", () => {
    expect(clampInternalFlightAfterDay(4, 9)).toBe(4);
    expect(clampInternalFlightAfterDay(null, 9)).toBe(9);
    expect(clampInternalFlightAfterDay(0, 9)).toBe(1);
    expect(clampInternalFlightAfterDay(20, 9)).toBe(9);
    expect(clampInternalFlightAfterDay(3, 0)).toBeNull();
  });

  it("inserta después del día exacto o al final si ese número no existe", () => {
    const days = [1, 2, 3, 4, 5];
    expect(
      shouldInsertInternalFlightAfterDay({
        dayNumber: 3,
        dayIndex: 2,
        itineraryLength: 5,
        afterDay: 3,
        hasImages: true,
        itineraryDayNumbers: days,
      }),
    ).toBe(true);
    expect(
      shouldInsertInternalFlightAfterDay({
        dayNumber: 5,
        dayIndex: 4,
        itineraryLength: 5,
        afterDay: 99,
        hasImages: true,
        itineraryDayNumbers: days,
      }),
    ).toBe(true);
    expect(
      shouldInsertInternalFlightAfterDay({
        dayNumber: 2,
        dayIndex: 1,
        itineraryLength: 5,
        afterDay: 3,
        hasImages: true,
        itineraryDayNumbers: days,
      }),
    ).toBe(false);
  });

  it("resuelve imágenes por destino y cae al array legacy solo en el primero", () => {
    const ids = ["a", "b"];
    expect(
      resolveDomesticImagesForDestination("b", ids, { b: ["x.jpg"] }, ["legacy.jpg"]),
    ).toEqual(["x.jpg"]);
    expect(resolveDomesticImagesForDestination("a", ids, {}, ["legacy.jpg"])).toEqual(["legacy.jpg"]);
    expect(resolveDomesticImagesForDestination("b", ids, {}, ["legacy.jpg"])).toEqual([]);
    expect(
      resolveDomesticImagesForDestination("a", ids, { b: ["peru.jpg"] }, ["peru.jpg"]),
    ).toEqual([]);
  });

  it("al quitar un destino no arrastra sus fotos internas", () => {
    expect(
      remapDomesticImagesByDestination({ a: ["1.jpg"], b: ["2.jpg"] }, ["b"]),
    ).toEqual({ b: ["2.jpg"] });
  });

  it("aplana y nombra el encabezado del PDF", () => {
    expect(flattenDomesticImagesByDestination({ a: ["1.jpg"], b: ["2.jpg", ""] })).toEqual([
      "1.jpg",
      "2.jpg",
    ]);
    expect(internalFlightPdfHeading("Turquía", true)).toBe("VUELO INTERNO — TURQUÍA");
    expect(internalFlightPdfHeading("Turquía", false)).toBe("VUELO INTERNO");
  });

  it("arma la ruta de carga: ida, internos por plan, conexión entre planes, regreso", () => {
    const turkey = {
      id: "t",
      name: "Turquía Esencial",
      hasInternalOrConnectionFlight: true,
      internalFlightAfterDay: 4,
    };
    const dubai = {
      id: "d",
      name: "Dubai Maravilloso",
      hasInternalOrConnectionFlight: true,
      internalFlightAfterDay: 2,
    };
    const italia = { id: "i", name: "Italia Turística", hasInternalOrConnectionFlight: false };

    expect(buildQuoteFlightUploadSteps([turkey]).map((s) => s.kind)).toEqual([
      "outbound",
      "internal",
      "return",
    ]);
    expect(buildQuoteFlightUploadSteps([italia]).map((s) => s.kind)).toEqual(["outbound", "return"]);

    const combo = buildQuoteFlightUploadSteps([turkey, dubai]);
    expect(combo.map((s) => `${s.step}. ${s.kind}`)).toEqual([
      "1. outbound",
      "2. internal",
      "3. connection",
      "4. internal",
      "5. return",
    ]);
    expect(combo[1]).toMatchObject({ destId: "t", afterDay: 4 });
    expect(combo[3]).toMatchObject({ destId: "d", afterDay: 2 });

    const reordered = buildQuoteFlightUploadSteps([dubai, turkey, italia]);
    expect(reordered.map((s) => s.kind)).toEqual([
      "outbound",
      "internal",
      "connection",
      "internal",
      "connection",
      "return",
    ]);
    expect(reordered[1]).toMatchObject({ destId: "d" });
    expect(reordered[3]).toMatchObject({ destId: "t" });
  });
});
