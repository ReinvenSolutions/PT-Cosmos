import { MessageCircle, Phone } from "lucide-react";
import { COMMERCIAL_LEAD } from "@/data/company-contacts";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Bloque visible en login/registro: contacto directo con gerencia comercial */
export function AuthCommercialContactCard({ className }: Props) {
  const { name, phoneDisplay, phoneE164, area } = COMMERCIAL_LEAD;
  const tel = `tel:+${phoneE164}`;
  const wa = `https://wa.me/${phoneE164}`;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-background to-primary/5",
        "p-4 shadow-sm ring-1 ring-primary/10",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden
        >
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">¿Necesitas ayuda?</p>
          <p className="text-sm font-semibold text-foreground leading-snug">{name}</p>
          <p className="text-xs text-muted-foreground leading-snug">{area}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <a
          href={tel}
          className={cn(
            "inline-flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg bg-primary px-3 py-2.5",
            "text-primary-foreground shadow-sm transition-colors",
            "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-medium leading-none">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            Llamar
          </span>
          <span className="text-sm font-semibold tabular-nums tracking-tight whitespace-nowrap leading-none">
            {phoneDisplay}
          </span>
        </a>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5",
            "text-sm font-medium text-foreground shadow-sm transition-colors",
            "hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
