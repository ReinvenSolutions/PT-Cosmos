/** Cupos por fecha de un plan. El precio es opcional. */
export type AvailabilityDay = {
  date: string;
  slots: number;
  price: string | null;
  destinationName?: string;
};

export type AvailabilityLevel = "none" | "low" | "medium" | "high" | "good";

export function dateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function availabilityLevel(slots: number): AvailabilityLevel {
  if (slots <= 0) return "none";
  if (slots <= 3) return "low";
  if (slots <= 7) return "medium";
  if (slots <= 15) return "high";
  return "good";
}

export const AVAILABILITY_LEGEND: { level: AvailabilityLevel; label: string; swatch: string }[] = [
  { level: "good", label: "16 o más cupos", swatch: "bg-emerald-600" },
  { level: "high", label: "8–15 cupos", swatch: "bg-yellow-400" },
  { level: "medium", label: "4–7 cupos", swatch: "bg-orange-500" },
  { level: "low", label: "1–3 cupos", swatch: "bg-red-600" },
  { level: "none", label: "Sin cupos", swatch: "bg-gray-400" },
];

export function availabilityBadgeClass(level: AvailabilityLevel): string {
  switch (level) {
    case "good":
      return "bg-emerald-600 text-white";
    case "high":
      return "bg-yellow-400 text-yellow-950";
    case "medium":
      return "bg-orange-500 text-white";
    case "low":
      return "bg-red-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

/** Fechas inclusivas entre dos YYYY-MM-DD (ordenadas). */
export function eachDateYmd(from: string, to: string): string[] {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const [y1, m1, d1] = start.split("-").map(Number);
  const [y2, m2, d2] = end.split("-").map(Number);
  const cursor = new Date(y1, m1 - 1, d1);
  const last = new Date(y2, m2 - 1, d2);
  const dates: string[] = [];
  while (cursor <= last) {
    dates.push(dateToYmd(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
