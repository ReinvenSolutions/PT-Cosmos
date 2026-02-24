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
import { useToast } from "@/hooks/use-toast";

interface FirstPageCommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: string;
  onSave: (comments: string) => void;
}

export function FirstPageCommentsModal({
  open,
  onOpenChange,
  comments,
  onSave,
}: FirstPageCommentsModalProps) {
  const [value, setValue] = useState(comments);
  const { toast } = useToast();

  // Sincronizar con datos del padre cuando se cargan (ej: plan existente desde API)
  useEffect(() => {
    setValue(comments);
  }, [comments, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setValue(comments);
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(value);
    onOpenChange(false);
    toast({ title: "Comentarios guardados", description: "Los cambios se aplicarán al guardar el plan." });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Comentarios primera hoja del PDF</DialogTitle>
          <DialogDescription>
            Texto que aparece en la sección &quot;COMENTARIOS&quot; de la primera hoja del PDF. Puedes usar texto normal y **negrita** para resaltar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label>Comentarios</Label>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej: Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana. Recuerda consultar los servicios no incluidos. **Tarifa aérea NO reembolsable**, permite cambio con penalidades + diferencia de tarifa."
            rows={8}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Usa **texto** para resaltar en negrita en el PDF.
          </p>
        </div>
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
