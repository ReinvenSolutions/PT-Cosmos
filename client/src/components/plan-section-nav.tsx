import { useEffect, useRef } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  DollarSign,
  FileText,
  ImageIcon,
  ListChecks,
  Route,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PLAN_EDITOR_SECTIONS = [
  { id: "basico", label: "Básico", hint: "Nombre, país y descripción", icon: FileText },
  { id: "itinerario", label: "Itinerario", hint: "Día a día del viaje", icon: Route },
  { id: "hoteles", label: "Hoteles", hint: "Dónde se hospedan", icon: Building2 },
  { id: "incl-excl", label: "Incluye", hint: "Qué entra y qué no", icon: ListChecks },
  { id: "precios", label: "Precios", hint: "Tarifas e impuestos", icon: DollarSign },
  { id: "cupos", label: "Cupos", hint: "Salidas y disponibilidad", icon: CalendarDays },
  { id: "imagenes", label: "Imágenes", hint: "Galería del plan", icon: ImageIcon },
] as const;

export type PlanEditorSectionId = (typeof PLAN_EDITOR_SECTIONS)[number]["id"];

function SectionButton({
  icon: Icon,
  label,
  hint,
  index,
  active,
  compact,
  ready,
  onSelect,
  buttonRef,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  index: number;
  active: boolean;
  compact?: boolean;
  ready?: boolean;
  onSelect: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "group text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        compact
          ? "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
          : "flex w-full items-center gap-3 rounded-xl px-2.5 py-2",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : compact
            ? "border-border bg-background text-foreground hover:bg-muted"
            : "border-transparent text-foreground hover:bg-muted/80"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          compact ? "h-6 w-6" : "h-8 w-8",
          active ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <span className="min-w-0">
        <span className={cn("block font-medium leading-none", compact ? "text-sm" : "text-sm")}>
          {compact ? label : `${index + 1}. ${label}`}
        </span>
        {!compact && (
          <span className={cn("mt-1 block text-xs leading-snug", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {hint}
          </span>
        )}
      </span>
      {ready ? (
        <Check className={cn("h-3.5 w-3.5 shrink-0", compact ? "" : "ml-auto", active ? "text-primary-foreground" : "text-primary")} aria-label="Con contenido" />
      ) : null}
    </button>
  );
}

export function PlanSectionNav({
  activeId,
  onChange,
  sections = PLAN_EDITOR_SECTIONS,
  readyIds,
}: {
  activeId: string;
  onChange: (id: string) => void;
  sections?: readonly (typeof PLAN_EDITOR_SECTIONS)[number][];
  readyIds?: ReadonlySet<string>;
}) {
  const current = Math.max(0, sections.findIndex((section) => section.id === activeId));
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[current]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [current]);

  return (
    <div className="lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto">
      <div className="mb-2 hidden items-end justify-between px-1 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secciones</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {current + 1} de {sections.length}
        </p>
      </div>

      <div
        className="sticky top-16 z-20 -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur md:-mx-8 md:px-8 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        role="tablist"
        aria-label="Secciones del plan"
      >
        <div className="flex gap-2 overflow-x-auto pb-0.5 lg:hidden">
          {sections.map((section, index) => (
            <SectionButton
              key={section.id}
              icon={section.icon}
              label={section.label}
              hint={section.hint}
              index={index}
              active={section.id === activeId}
              ready={readyIds?.has(section.id)}
              buttonRef={(node) => {
                itemRefs.current[index] = node;
              }}
              onSelect={() => onChange(section.id)}
              compact
            />
          ))}
        </div>
        <div className="hidden flex-col gap-1 lg:flex">
          {sections.map((section, index) => (
            <SectionButton
              key={section.id}
              icon={section.icon}
              label={section.label}
              hint={section.hint}
              index={index}
              active={section.id === activeId}
              ready={readyIds?.has(section.id)}
              onSelect={() => onChange(section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function planSectionNeighbors(
  activeId: string,
  sections: readonly (typeof PLAN_EDITOR_SECTIONS)[number][] = PLAN_EDITOR_SECTIONS,
) {
  const index = Math.max(0, sections.findIndex((section) => section.id === activeId));
  return {
    index,
    prev: index > 0 ? sections[index - 1] : null,
    next: index < sections.length - 1 ? sections[index + 1] : null,
  };
}
