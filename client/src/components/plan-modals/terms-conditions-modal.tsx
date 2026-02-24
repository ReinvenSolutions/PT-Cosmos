import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface TermsConditionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termsConditions: string;
  flightTerms: string;
  onSave: (termsConditions: string, flightTerms: string) => void;
}

export function TermsConditionsModal({
  open,
  onOpenChange,
  termsConditions,
  flightTerms,
  onSave,
}: TermsConditionsModalProps) {
  const [generalTerms, setGeneralTerms] = useState(termsConditions);
  const [flightTermsValue, setFlightTermsValue] = useState(flightTerms);
  const { toast } = useToast();

  useEffect(() => {
    setGeneralTerms(termsConditions);
    setFlightTermsValue(flightTerms);
  }, [termsConditions, flightTerms, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setGeneralTerms(termsConditions);
      setFlightTermsValue(flightTerms);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(generalTerms, flightTermsValue);
    onOpenChange(false);
    toast({ title: "Términos y condiciones guardados", description: "Los cambios se aplicarán al guardar el plan." });
  };

  const defaultFlightTerms = `Los boletos de avión no son reembolsables.

Una vez emitido el boleto no puede ser asignado a una persona o aerolínea diferente.

Los cambios en los boletos pueden ocasionar cargos extra, están sujetos a disponibilidad, clase tarifaria y políticas de cada aerolínea al momento de solicitar el cambio.

Para vuelos nacionales presentarse 2 horas antes de la salida del vuelo. Para vuelos internacionales presentarse 3 horas antes de la salida del vuelo.`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Términos y condiciones</DialogTitle>
          <DialogDescription>
            Términos generales del plan y términos que aparecen debajo de cada vuelo en el PDF.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Términos generales</TabsTrigger>
            <TabsTrigger value="flight">Términos por vuelo</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="flex-1 overflow-y-auto mt-4">
            <div>
              <Label>Términos y condiciones generales del plan</Label>
              <Textarea
                value={generalTerms}
                onChange={(e) => setGeneralTerms(e.target.value)}
                placeholder="Ej: Servicios: Cambios en el itinerario posibles según condiciones y disponibilidad del guía. Hotelería: Alojamiento en hoteles de primera entre 4 y 5 estrellas similares a los planificados..."
                rows={12}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Estos términos aparecen en la sección final del PDF.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="flight" className="flex-1 overflow-y-auto mt-4">
            <div>
              <Label>Términos debajo de cada vuelo</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Texto que se imprime debajo de cada imagen de vuelo (ida, regreso, interno, conexión) en el PDF.
              </p>
              <Textarea
                value={flightTermsValue}
                onChange={(e) => setFlightTermsValue(e.target.value)}
                placeholder={defaultFlightTerms}
                rows={12}
                className="mt-2 font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setFlightTermsValue(defaultFlightTerms)}
              >
                Usar texto por defecto
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
