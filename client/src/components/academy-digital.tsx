import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenedor base para secciones de la academia (usuario y admin).
 * Espaciado consistente y ancho cómodo para lectura.
 */
export function AcademySection({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "min-h-[50vh] w-full",
        "px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6 lg:px-6 lg:py-6 xl:px-8 2xl:px-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Hero editorial para /tutoriales (lado agencia).
 * Usa la paleta Cosmos (teal + oro + aqua) con un acento sutil tipo LMS corporativo.
 */
export function AcademyPublicHero({
  title = "Academia digital",
  subtitle,
  badge,
  stats,
}: {
  title?: string;
  subtitle: string;
  badge?: string;
  stats?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm md:rounded-3xl">
      {/* Línea de acento superior (teal → aqua → oro) */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[hsl(197_53%_36%)] via-[hsl(191_46%_55%)] to-[hsl(44_54%_52%)]"
        aria-hidden
      />
      {/* Textura sutil de fondo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(197 53% 36%) 0, transparent 45%), radial-gradient(circle at 85% 75%, hsl(44 54% 52%) 0, transparent 45%)",
        }}
        aria-hidden
      />
      <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8 lg:p-10">
        <div className="flex flex-col gap-3 md:gap-4">
          {badge && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {badge}
            </span>
          )}
          <div className="space-y-2">
            <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-[2.6rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>
          </div>
        </div>
        {stats && <div className="lg:shrink-0">{stats}</div>}
      </div>
    </div>
  );
}

/** Barra de título para administración de la academia. */
export function AcademyAdminHeader({
  title,
  description,
  actions,
  eyebrow = "Academia",
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">{eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AcademyStatPill({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/25",
        className,
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}
