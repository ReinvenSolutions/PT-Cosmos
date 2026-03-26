import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TRM_EFFECTIVE_SURCHARGE_COP, effectiveTrmFromBase } from "@shared/trm";

type GlobalTrmResponse = {
  baseTrm: number | null;
  effectiveTrm: number | null;
  surchargeCop: number;
};

export function GlobalTrmAdminMenuItem() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { data, isLoading } = useQuery<GlobalTrmResponse>({
    queryKey: ["/api/settings/global-trm"],
    enabled: open,
  });

  useEffect(() => {
    if (open && data) {
      setInputValue(data.baseTrm != null ? String(data.baseTrm) : "");
    }
  }, [open, data?.baseTrm]);

  const saveMutation = useMutation({
    mutationFn: async (baseTrm: number | null) => {
      const res = await apiRequest("PUT", "/api/admin/settings/global-trm", { baseTrm });
      return res.json() as Promise<GlobalTrmResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/global-trm"] });
      toast({
        title: "TRM actualizada",
        description: "El valor global del cotizador se guardó correctamente.",
      });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "No se pudo guardar la TRM.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      saveMutation.mutate(null);
      return;
    }
    const n = parseFloat(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast({
        title: "Valor inválido",
        description: "Ingresa un número mayor que cero o deja vacío para quitar la TRM.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(n);
  };

  const previewBase = (() => {
    const t = inputValue.trim().replace(/,/g, "");
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const previewEffective = effectiveTrmFromBase(previewBase);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          onClick={() => setOpen(true)}
          tooltip="TRM del cotizador"
          data-testid="sidebar-global-trm"
          className="rounded-lg px-3 py-2.5 text-[13px] [&>svg]:opacity-70 [&>svg]:size-[18px] [&>svg]:shrink-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"
        >
          <Banknote className="h-[18px] w-[18px]" />
          <span>TRM del cotizador</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>TRM global del cotizador</DialogTitle>
          <DialogDescription>
            Valor base en COP por cada USD. Al cotizar en COP, el sistema suma automáticamente {TRM_EFFECTIVE_SURCHARGE_COP} COP a esta base (igual que antes).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="global-trm-base">TRM base (COP / USD)</Label>
            <Input
              id="global-trm-base"
              type="text"
              inputMode="decimal"
              placeholder="Ej. 4200"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading || saveMutation.isPending}
            />
            {previewEffective != null && (
              <p className="text-sm text-muted-foreground">
                Tasa aplicada en cotizador:{" "}
                <span className="font-semibold text-foreground">
                  $ {previewEffective.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP/USD
                </span>{" "}
                (base + {TRM_EFFECTIVE_SURCHARGE_COP})
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Deja el campo vacío y guarda para quitar la TRM global. Los asesores no podrán cotizar en COP hasta que configures un valor de nuevo.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
