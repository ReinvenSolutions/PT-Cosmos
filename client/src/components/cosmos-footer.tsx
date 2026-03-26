import { MapPin, Phone } from "lucide-react";

export function CosmosFooter() {
  return (
    <footer className="bg-foreground text-background mt-auto border-t border-background/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-2 text-sm max-w-3xl lg:max-w-none">
          <div className="flex gap-3 sm:col-span-1">
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
            <Phone className="h-5 w-5 shrink-0 text-[hsl(191,46%,65%)] mt-0.5" aria-hidden />
            <div className="space-y-2">
              <p className="font-semibold text-background mb-1">Contacto</p>
              <p className="text-background/85">
                <span className="text-background/70">Cotizaciones: </span>
                <a
                  href="tel:+573146576500"
                  className="font-medium underline underline-offset-2 decoration-background/40 hover:text-white hover:decoration-white"
                >
                  314 657 6500
                </a>
              </p>
              <p className="text-background/85">
                <span className="text-background/70">Gerencia comercial: </span>
                <a
                  href="tel:+573106776640"
                  className="font-medium underline underline-offset-2 decoration-background/40 hover:text-white hover:decoration-white"
                >
                  310 677 6640
                </a>
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-background/55 mt-8 pt-6 border-t border-background/10">
          &copy; {new Date().getFullYear()} Cosmos Mayorista. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
