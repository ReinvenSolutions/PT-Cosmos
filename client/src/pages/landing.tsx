import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Plane className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-foreground">
          Sistema de Cotización
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gestiona y crea cotizaciones profesionales para paquetes turísticos
        </p>
        <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto">
          Accede a destinos pre-configurados, genera itinerarios personalizados y exporta cotizaciones en PDF con aspecto profesional.
        </p>
        <Button
          size="lg"
          onClick={() => {
            window.location.href = "/api/login";
          }}
          data-testid="button-login"
          className="px-8 py-6 text-lg"
        >
          Iniciar Sesión
        </Button>
      </div>
    </div>
  );
}
