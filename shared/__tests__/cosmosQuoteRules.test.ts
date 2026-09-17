import { describe, expect, it } from "vitest";
import { validateCosmosQuoteDraft } from "../cosmosQuoteRules";

describe("validateCosmosQuoteDraft", () => {
  it("impide combinar un bloqueo con otro plan", () => {
    const result = validateCosmosQuoteDraft([
      { id: "1", name: "Bloqueo Cusco", country: "Perú", isBloqueo: true },
      { id: "2", name: "Dubai", country: "EAU" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/bloqueo/i);
  });

  it("exige Turquía primero al combinar", () => {
    const result = validateCosmosQuoteDraft([
      { id: "2", name: "Dubai Maravilloso", country: "EAU" },
      { id: "1", name: "Turquía Esencial", country: "Turquía" },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/primero/i);
  });

  it("respeta cupos de bloqueo", () => {
    const result = validateCosmosQuoteDraft(
      [{ id: "1", name: "Bloqueo", country: "Perú", isBloqueo: true, bloqueoCuposDisponibles: 2 }],
      { passengers: 4 }
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/cupo/i);
  });
});
