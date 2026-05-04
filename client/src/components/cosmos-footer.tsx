import type { ReactNode } from "react";
import { MapPin, Headphones, Users } from "lucide-react";
import { RntNotice } from "@/components/rnt-notice";
import { OPERATIVE_MAIN, TEAM_CONTACTS } from "@/data/company-contacts";

function TelLink({ e164, children }: { e164: string; children: ReactNode }) {
  return (
    <a
      href={`tel:+${e164}`}
      className="font-medium underline underline-offset-2 decoration-background/40 hover:text-white hover:decoration-white"
    >
      {children}
    </a>
  );
}

export function CosmosFooter() {
  return (
    <footer className="bg-foreground text-background mt-auto border-t border-background/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-sm max-w-5xl lg:max-w-none">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-[hsl(191,46%,65%)] mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold text-background mb-1.5">Dirección</p>
              <address className="not-italic text-background/85 leading-relaxed">
                CRA 53 # 50 - 67
                <br />
                Venecia, Antioquia
              </address>
            </div>
          </div>

          <div className="flex gap-3">
            <Headphones className="h-5 w-5 shrink-0 text-[hsl(191,46%,65%)] mt-0.5" aria-hidden />
            <div className="space-y-2">
              <p className="font-semibold text-background mb-1">{OPERATIVE_MAIN.area}</p>
              <p className="text-background/85">
                <TelLink e164={OPERATIVE_MAIN.phoneE164}>{OPERATIVE_MAIN.phoneDisplay}</TelLink>
              </p>
              {OPERATIVE_MAIN.note && (
                <p className="text-background/70 text-xs">{OPERATIVE_MAIN.note}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 sm:col-span-2 lg:col-span-1">
            <Users className="h-5 w-5 shrink-0 text-[hsl(191,46%,65%)] mt-0.5" aria-hidden />
            <div className="space-y-2 min-w-0 flex-1">
              <p className="font-semibold text-background mb-1">Contactos por área</p>
              <ul className="space-y-2 text-background/85">
                {TEAM_CONTACTS.map((c) => (
                  <li key={c.phoneE164} className="leading-snug">
                    <span className="text-background font-medium">
                      {c.name ? `${c.name}: ` : null}
                    </span>
                    <TelLink e164={c.phoneE164}>{c.phoneDisplay}</TelLink>
                    <span className="text-background/70"> — {c.area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-background/10 space-y-2">
          <RntNotice variant="onDark" className="text-background/80" />
          <p className="text-center text-xs text-background/55">
            &copy; {new Date().getFullYear()} Cosmos Mayorista. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
