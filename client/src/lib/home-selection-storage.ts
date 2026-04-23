/** Persiste en sessionStorage la selección del cotizador (home) para no perderla al abrir la ficha de un plan. */

const STORAGE_KEY = "viajeRapido_home_builder";

export type HomeBuilderPersisted = {
  destinations: string[];
  startDate: string;
};

export function loadHomeBuilderSelection(): HomeBuilderPersisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) return null;
    const destinations = (p as { destinations?: unknown }).destinations;
    if (!Array.isArray(destinations)) return null;
    const startDate = (p as { startDate?: unknown }).startDate;
    return {
      destinations: destinations.filter((x): x is string => typeof x === "string"),
      startDate: typeof startDate === "string" ? startDate : "",
    };
  } catch {
    return null;
  }
}

export function saveHomeBuilderSelection(data: HomeBuilderPersisted) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalYmd(s: string): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
