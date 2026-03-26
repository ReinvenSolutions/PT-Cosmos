/**
 * Etiqueta corta para títulos cuando hay combinación (2+ destinos): evita solapes en PDF/UI.
 * Ej.: "DUBAI Maravilloso" → "Dubai", "EGIPTO ... - CRUCERO..." → "Egipto", "SÃO PAULO + RIO..." → "São Paulo".
 */
export function simplifiedPlanLabel(raw: string): string {
  const s0 = (raw || "").trim();
  if (!s0) return "";

  const overrides: Array<{ re: RegExp; label: string }> = [
    { re: /gran\s+tour\s+de\s+europa/i, label: "Europa" },
    { re: /turqu[ií]a\s+esencial/i, label: "Turquía" },
    { re: /italia\s+tur[ií]stica/i, label: "Italia" },
    { re: /espa[nñ]a\s+e\s+italia/i, label: "España e Italia" },
    { re: /egipto/i, label: "Egipto" },
    { re: /dubai/i, label: "Dubai" },
    { re: /finlandia/i, label: "Finlandia" },
    { re: /per[uú]|cusco|lima|machu/i, label: "Perú" },
  ];

  for (const { re, label } of overrides) {
    if (re.test(s0)) return label;
  }

  let s = s0.replace(/\([^)]*\)/g, " ").trim();
  s = s.split(/\s*[-–—]\s*/)[0].trim();
  s = s.split(/\s*\+\s*/)[0].trim();
  s = s.replace(/\s+/g, " ");

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const w0 = words[0];
  const w1 = words[1];
  const w2 = words[2];

  if (/^s[ãa]o$/i.test(w0) && w1 && /^paulo$/i.test(w1)) {
    return formatTitleCaseWords([w0, w1]);
  }
  if (/^rio$/i.test(w0) && /^de$/i.test(w1) && w2 && /janeiro/i.test(w2)) {
    return formatTitleCaseWords([w0, w1, w2]);
  }

  return formatTitleCaseWords([w0]);
}

function formatTitleCaseWords(parts: string[]): string {
  return parts
    .map((w) => {
      const lower = w.toLowerCase();
      if (lower === "de" || lower === "y" || lower === "e") return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Nombres cortos solo si hay combinación (2+ destinos con nombre no vacío).
 * Mantiene la misma longitud que la entrada (cadenas vacías se conservan).
 */
export function displayPlanNamesForCombo(fullNames: string[]): string[] {
  const trimmed = fullNames.map((n) => (n || "").trim());
  const nonEmpty = trimmed.filter(Boolean).length;
  if (nonEmpty < 2) {
    return trimmed;
  }
  return trimmed.map((t) => (t ? simplifiedPlanLabel(t) : ""));
}

function labelOrRaw(labels: string[], raw: string[], i: number): string {
  return (labels[i] || "").trim() || (raw[i] || "").trim() || "Destino";
}

/**
 * Títulos de tramos de conexión entre planes (orden = orden de la cotización / PDF).
 */
export function connectionSegmentCardTitle(planNames: string[], segmentIndex: number): string {
  const raw = planNames.map((n) => (n || "").trim());
  const labels = displayPlanNamesForCombo(raw);
  const n = raw.filter(Boolean).length;
  if (n < 2 || segmentIndex < 0 || segmentIndex > raw.length - 2) {
    return "Conexión entre destinos";
  }
  const a = labelOrRaw(labels, raw, segmentIndex);
  const b = labelOrRaw(labels, raw, segmentIndex + 1);
  if (n === 2) {
    return `Conexión ${a} y ${b}`;
  }
  return `Conexión ${a} a ${b}`;
}

/** Encabezado para el PDF (alineado con «VUELO DE CONEXIÓN TURQUÍA - DUBAI»). */
export function connectionSegmentPdfHeading(planNames: string[], segmentIndex: number): string {
  const raw = planNames.map((n) => (n || "").trim());
  const labels = displayPlanNamesForCombo(raw);
  const count = raw.filter(Boolean).length;
  if (count < 2 || segmentIndex < 0 || segmentIndex > raw.length - 2) return "VUELO DE CONEXIÓN";
  const a = labelOrRaw(labels, raw, segmentIndex);
  const b = labelOrRaw(labels, raw, segmentIndex + 1);
  const u = (s: string) => s.toUpperCase();
  return `VUELO DE CONEXIÓN — ${u(a)} A ${u(b)}`;
}

export type ConnectionSegmentImages = { images: string[] };

/**
 * Al reordenar destinos, conserva las imágenes del tramo que sigue siendo el mismo par (A→B).
 */
export function remapConnectionSegmentsByEdgeOrder(
  previousDestIds: string[],
  nextDestIds: string[],
  segments: ConnectionSegmentImages[],
): ConnectionSegmentImages[] {
  const edgeKey = (a: string, b: string) => `${a}→${b}`;
  const byEdge = new Map<string, string[]>();
  for (let i = 0; i < previousDestIds.length - 1; i++) {
    const k = edgeKey(previousDestIds[i], previousDestIds[i + 1]);
    byEdge.set(k, [...(segments[i]?.images ?? [])]);
  }
  const out: ConnectionSegmentImages[] = [];
  for (let i = 0; i < nextDestIds.length - 1; i++) {
    const imgs = byEdge.get(edgeKey(nextDestIds[i], nextDestIds[i + 1])) ?? [];
    out.push({ images: [...imgs] });
  }
  return out;
}
