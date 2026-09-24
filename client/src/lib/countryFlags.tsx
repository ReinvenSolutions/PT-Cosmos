/** Solo los países del catálogo. Cada SVG se pide al renderizar, no la hoja completa de flag-icons. */
const FLAG_URLS = import.meta.glob(
  "../../../node_modules/flag-icons/flags/4x3/{ae,ar,au,bo,br,ca,ch,cl,cn,co,cr,cu,de,do,ec,eg,es,fi,fr,gb,gr,gt,hr,id,il,in,it,jo,jp,ke,ma,mx,my,nz,pa,pe,pt,qa,sa,sg,th,tr,tz,us,vn,za}.svg",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

function flagSrc(code: string): string | undefined {
  const suffix = `/${code.toLowerCase()}.svg`;
  const key = Object.keys(FLAG_URLS).find((entry) => entry.endsWith(suffix));
  return key ? FLAG_URLS[key] : undefined;
}

/** Nombres en español (e inglés habitual) → ISO 3166-1 alpha-2. Las banderas salen de SVG, no de emoji. */
const COUNTRY_ISO: Record<string, string> = {
  turquia: "tr",
  turkey: "tr",
  egipto: "eg",
  egypt: "eg",
  peru: "pe",
  colombia: "co",
  finlandia: "fi",
  finland: "fi",
  italia: "it",
  italy: "it",
  espana: "es",
  spain: "es",
  francia: "fr",
  france: "fr",
  suiza: "ch",
  switzerland: "ch",
  "emiratos arabes unidos": "ae",
  emiratos: "ae",
  eau: "ae",
  uae: "ae",
  dubai: "ae",
  guatemala: "gt",
  grecia: "gr",
  greece: "gr",
  marruecos: "ma",
  morocco: "ma",
  tailandia: "th",
  thailand: "th",
  vietnam: "vn",
  japon: "jp",
  japan: "jp",
  china: "cn",
  india: "in",
  mexico: "mx",
  brasil: "br",
  brazil: "br",
  argentina: "ar",
  chile: "cl",
  ecuador: "ec",
  bolivia: "bo",
  portugal: "pt",
  alemania: "de",
  germany: "de",
  "reino unido": "gb",
  inglaterra: "gb",
  "estados unidos": "us",
  usa: "us",
  canada: "ca",
  "costa rica": "cr",
  panama: "pa",
  cuba: "cu",
  "republica dominicana": "do",
  jordania: "jo",
  israel: "il",
  "arabia saudi": "sa",
  qatar: "qa",
  singapur: "sg",
  indonesia: "id",
  malasia: "my",
  "nueva zelanda": "nz",
  australia: "au",
  sudafrica: "za",
  kenia: "ke",
  tanzania: "tz",
  croacia: "hr",
};

function normalizeCountry(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Variantes que deben verse como una sola categoría en el desplegable. */
const COUNTRY_GROUP_LABEL: Record<string, string> = {
  emiratos: "Emiratos Árabes Unidos",
  "emiratos arabes unidos": "Emiratos Árabes Unidos",
  "emiratos arabes": "Emiratos Árabes Unidos",
  eau: "Emiratos Árabes Unidos",
  uae: "Emiratos Árabes Unidos",
  "united arab emirates": "Emiratos Árabes Unidos",
};

const COUNTRY_KEYS = Object.keys(COUNTRY_ISO).sort((a, b) => b.length - a.length);

export function countryGroupLabel(country: string | null | undefined): string {
  const trimmed = country?.trim() || "";
  if (!trimmed) return "Sin país";
  return COUNTRY_GROUP_LABEL[normalizeCountry(trimmed)] ?? trimmed;
}

export function countryIsoCodes(country: string | null | undefined): string[] {
  const normalized = normalizeCountry(country ?? "");
  if (!normalized) return [];
  const direct = COUNTRY_ISO[normalized];
  if (direct) return [direct];

  const parts = normalized.split(/[,/]|\s+y\s+|\s+e\s+/).map((part) => part.trim()).filter(Boolean);
  const fromParts = parts.map((part) => COUNTRY_ISO[part]).filter((code): code is string => Boolean(code));
  if (fromParts.length) return Array.from(new Set(fromParts));

  const found: string[] = [];
  for (const key of COUNTRY_KEYS) {
    if (normalized.includes(key)) found.push(COUNTRY_ISO[key]);
  }
  return Array.from(new Set(found));
}

export function CountryFlag({ code, title }: { code: string; title: string }) {
  const src = flagSrc(code);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={18}
      height={14}
      title={title}
      aria-label={title}
      className="inline-block h-[14px] w-[18px] shrink-0 rounded-[2px] object-cover shadow-sm"
    />
  );
}

export function CountryFlags({ country }: { country: string }) {
  const codes = countryIsoCodes(country);
  if (!codes.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {codes.map((code) => (
        <CountryFlag key={code} code={code} title={country} />
      ))}
    </span>
  );
}
