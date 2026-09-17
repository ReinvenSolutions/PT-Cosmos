import { describe, expect, it } from "vitest";
import {
  formatCosmosQuoteMoney,
  parseCosmosAdminMutation,
  parseCosmosClientAction,
  parseCosmosVoiceJobMetadata,
  parseRpcAction,
  primaryQuoteHighlightTarget,
} from "../cosmosAgent";

describe("cosmosAgent payloads", () => {
  it("acepta open_plan y start_quote", () => {
    expect(parseCosmosClientAction({ type: "open_plan", planId: "11111111-1111-4111-8111-111111111111" })).toEqual({
      type: "open_plan",
      planId: "11111111-1111-4111-8111-111111111111",
    });
    expect(
      parseCosmosClientAction({
        type: "start_quote",
        planIds: ["11111111-1111-4111-8111-111111111111"],
        startDate: "2026-10-01",
      })
    ).toMatchObject({ type: "start_quote" });
  });

  it("acepta refresh_admin para refrescar pantallas de administración", () => {
    expect(
      parseCosmosClientAction({ type: "refresh_admin", scope: "users" })
    ).toEqual({ type: "refresh_admin", scope: "users" });
    expect(parseCosmosClientAction({ type: "refresh_admin", scope: "nope" })).toBeNull();
  });

  it("rechaza acciones inválidas", () => {
    expect(parseCosmosClientAction({ type: "open_plan", planId: "no-uuid" })).toBeNull();
    expect(parseCosmosClientAction({ type: "explode" })).toBeNull();
  });

  it("acepta propose_action, navigate y highlight", () => {
    const planId = "11111111-1111-4111-8111-111111111111";
    expect(
      parseCosmosClientAction({
        type: "propose_action",
        label: "Abrir ficha",
        action: { type: "open_plan", planId },
      })
    ).toMatchObject({ type: "propose_action", label: "Abrir ficha" });
    expect(
      parseCosmosClientAction({ type: "navigate", path: "/advisor", title: "Mis cotizaciones" })
    ).toEqual({ type: "navigate", path: "/advisor", title: "Mis cotizaciones" });
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.dates" })
    ).toMatchObject({ type: "highlight", target: "quote.dates" });
  });

  it("acepta patch_quote con vuelos, asistencia, PVP, pago mínimo y nombre de archivo", () => {
    const action = parseCosmosClientAction({
      type: "patch_quote",
      patch: {
        flightsCost: 850,
        flightsCurrency: "USD",
        assistanceCost: 60,
        assistanceCurrency: "USD",
        finalPrice: 4200,
        finalPriceCurrency: "USD",
        minPayment: 2500,
        customFilename: "Familia Perez Turquia",
      },
    });
    expect(action).toMatchObject({
      type: "patch_quote",
      patch: {
        flightsCost: 850,
        assistanceCost: 60,
        finalPrice: 4200,
        minPayment: 2500,
        customFilename: "Familia Perez Turquia",
      },
    });
  });

  it("acepta patch_quote con mejoras seleccionadas", () => {
    const planId = "11111111-1111-4111-8111-111111111111";
    expect(
      parseCosmosClientAction({
        type: "patch_quote",
        patch: { selectedUpgrades: { [planId]: "option2" } },
      })
    ).toMatchObject({
      type: "patch_quote",
      patch: { selectedUpgrades: { [planId]: "option2" } },
    });
  });

  it("acepta pago mínimo como porcentaje del PVP", () => {
    expect(
      parseCosmosClientAction({
        type: "patch_quote",
        patch: { minPaymentPercent: 60 },
      })
    ).toMatchObject({ type: "patch_quote", patch: { minPaymentPercent: 60 } });
  });

  it("acepta highlight de PVP, costos, vuelos y nombre de archivo", () => {
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.pvp" })
    ).toMatchObject({ type: "highlight", target: "quote.pvp" });
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.costs" })
    ).toMatchObject({ type: "highlight", target: "quote.costs" });
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.flightsCost" })
    ).toMatchObject({ type: "highlight", target: "quote.flightsCost" });
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.assistanceCost" })
    ).toMatchObject({ type: "highlight", target: "quote.assistanceCost" });
    expect(
      parseCosmosClientAction({ type: "highlight", target: "quote.filename" })
    ).toMatchObject({ type: "highlight", target: "quote.filename" });
  });

  it("acepta save_quote, reset_quote y start_quote con replace", () => {
    expect(
      parseCosmosClientAction({
        type: "save_quote",
        clientId: "11111111-1111-4111-8111-111111111111",
        thenReset: true,
      })
    ).toMatchObject({ type: "save_quote", thenReset: true });
    expect(parseCosmosClientAction({ type: "reset_quote" })).toEqual({ type: "reset_quote" });
    expect(
      parseCosmosClientAction({
        type: "start_quote",
        planIds: ["11111111-1111-4111-8111-111111111111"],
        replace: true,
      })
    ).toMatchObject({ type: "start_quote", replace: true });
  });

  it("formatea montos de cotización sin separadores de miles", () => {
    expect(formatCosmosQuoteMoney(850, "USD")).toBe("850");
    expect(formatCosmosQuoteMoney(850.5, "USD")).toBe("850.50");
    expect(formatCosmosQuoteMoney(2500000, "COP")).toBe("2500000");
  });

  it("al cambiar vuelos no señala el PVP aunque el parche lo traiga", () => {
    expect(primaryQuoteHighlightTarget({ flightsCost: 800, finalPrice: 4200 })).toBe("quote.flightsCost");
    expect(primaryQuoteHighlightTarget({ passengers: 3, finalPrice: 4200 })).toBe("quote.passengers");
    expect(primaryQuoteHighlightTarget({ assistanceCost: 60 })).toBe("quote.assistanceCost");
    expect(primaryQuoteHighlightTarget({ finalPrice: 4200 })).toBe("quote.pvp");
    expect(primaryQuoteHighlightTarget({ originCity: "BOG" })).toBe("quote.origin");
  });

  it("parsea metadata de job de voz", () => {
    const meta = parseCosmosVoiceJobMetadata(
      JSON.stringify({
        sessionId: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        userRole: "agency",
        userName: "Ana",
        channel: "voice",
        userIdentity: "user-22222222-2222-4222-8222-222222222222",
      })
    );
    expect(meta?.userName).toBe("Ana");
    expect(parseCosmosVoiceJobMetadata("{")).toBeNull();
  });
});

describe("parseRpcAction", () => {
  it("traduce RPC open_plan y start_quote", () => {
    const planId = "11111111-1111-4111-8111-111111111111";
    expect(parseRpcAction("open_plan", JSON.stringify({ planId }))).toEqual({
      type: "open_plan",
      planId,
    });
    expect(parseRpcAction("start_quote", JSON.stringify({ planIds: [planId] }))).toEqual({
      type: "start_quote",
      planIds: [planId],
    });
    expect(
      parseRpcAction(
        "cosmos_action",
        JSON.stringify({ type: "navigate", path: "/mis-clientes", title: "Mis clientes" })
      )
    ).toEqual({ type: "navigate", path: "/mis-clientes", title: "Mis clientes" });
    expect(
      parseRpcAction(
        "cosmos_action",
        JSON.stringify({
          type: "patch_quote",
          patch: { flightsCost: 900, assistanceCost: 45, finalPrice: 3800, customFilename: "Cotizacion Ana" },
        })
      )
    ).toMatchObject({
      type: "patch_quote",
      patch: { flightsCost: 900, customFilename: "Cotizacion Ana" },
    });
  });
});

describe("parseCosmosAdminMutation", () => {
  it("acepta un cambio de módulos y de estado de plan", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const planId = "22222222-2222-4222-8222-222222222222";
    expect(
      parseCosmosAdminMutation({
        kind: "set_user_modules",
        userId,
        userLabel: "Ana",
        enabledModules: {
          quote: true,
          quoteExpress: true,
          dayCounter: true,
          milesCalculator: true,
          academy: true,
          cosmos: true,
          cosmosVoice: false,
        },
      })
    ).toMatchObject({ kind: "set_user_modules", userLabel: "Ana" });
    expect(
      parseCosmosAdminMutation({
        kind: "set_plan_active",
        planId,
        planLabel: "Turquía",
        isActive: false,
      })
    ).toEqual({ kind: "set_plan_active", planId, planLabel: "Turquía", isActive: false });
  });

  it("rechaza mutaciones incompletas", () => {
    expect(parseCosmosAdminMutation({ kind: "set_plan_active" })).toBeNull();
    expect(parseCosmosAdminMutation({ kind: "delete_user" })).toBeNull();
  });
});
