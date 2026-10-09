import { describe, expect, it } from "vitest";
import { eachWeekdayYmd } from "../availability";

describe("eachWeekdayYmd", () => {
  it("devuelve solo los días marcados dentro del rango", () => {
    // 2026-10-05 es lunes y 2026-10-10 es sábado.
    expect(eachWeekdayYmd("2026-10-05", "2026-10-18", [1, 6])).toEqual([
      "2026-10-05",
      "2026-10-10",
      "2026-10-12",
      "2026-10-17",
    ]);
  });

  it("incluye el domingo y respeta un rango invertido", () => {
    expect(eachWeekdayYmd("2026-10-12", "2026-10-11", [0])).toEqual(["2026-10-11"]);
  });

  it("no devuelve fechas si no hay días elegidos", () => {
    expect(eachWeekdayYmd("2026-10-05", "2026-10-18", [])).toEqual([]);
  });

  it("devuelve la fecha única cuando coincide con el día elegido", () => {
    expect(eachWeekdayYmd("2026-10-09", "2026-10-09", [5])).toEqual(["2026-10-09"]);
    expect(eachWeekdayYmd("2026-10-09", "2026-10-09", [1])).toEqual([]);
  });
});
