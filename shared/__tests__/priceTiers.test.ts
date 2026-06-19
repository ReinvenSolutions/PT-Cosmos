import { describe, expect, it } from "vitest";
import { isPriceTierExpired, normalizeTierPrice, pruneExpiredPriceTiers } from "../priceTiers";

describe("priceTiers", () => {
  const today = "2026-06-19";

  it("elimina tiers con endDate anterior a hoy", () => {
    const tiers = [
      { endDate: "2026-06-18", price: "100.00" },
      { endDate: "2026-06-19", price: "110.00" },
      { endDate: "2026-06-20", price: "120.00" },
    ];
    expect(pruneExpiredPriceTiers(tiers, today)).toEqual([
      { endDate: "2026-06-19", price: "110.00" },
      { endDate: "2026-06-20", price: "120.00" },
    ]);
  });

  it("conserva el tier del día actual", () => {
    expect(isPriceTierExpired({ endDate: "2026-06-19", price: "100" }, today)).toBe(false);
    expect(isPriceTierExpired({ endDate: "2026-06-18", price: "100" }, today)).toBe(true);
  });

  it("elimina rangos de temporada cuya vigencia ya terminó", () => {
    const tiers = [
      { startDate: "2026-01-01", endDate: "2026-04-30", price: "660.00" },
      { startDate: "2026-05-01", endDate: "2026-09-30", price: "560.00" },
    ];
    expect(pruneExpiredPriceTiers(tiers, today)).toEqual([
      { startDate: "2026-05-01", endDate: "2026-09-30", price: "560.00" },
    ]);
  });

  it("devuelve null si no quedan tiers", () => {
    expect(pruneExpiredPriceTiers([{ endDate: "2026-01-01", price: "100" }], today)).toBeNull();
    expect(pruneExpiredPriceTiers([], today)).toBeNull();
    expect(pruneExpiredPriceTiers(null, today)).toBeNull();
  });

  it("normaliza precios a dos decimales", () => {
    expect(normalizeTierPrice("549")).toBe("549.00");
    expect(normalizeTierPrice("710")).toBe("710.00");
    expect(normalizeTierPrice("1080.5")).toBe("1080.50");
    expect(normalizeTierPrice("820,00")).toBe("820.00");
    expect(normalizeTierPrice("")).toBeNull();
    expect(normalizeTierPrice("abc")).toBeNull();
  });
});
