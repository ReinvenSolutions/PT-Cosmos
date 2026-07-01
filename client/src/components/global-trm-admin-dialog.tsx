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
import {
  DEFAULT_USD_PER_1000_LIFEMILES,
  DEFAULT_USD_PER_1000_SMILES,
} from "@shared/milesCalculator";

type GlobalTrmResponse = {
  baseTrm: number | null;
  effectiveTrm: number | null;
  surchargeCop: number;
  usdPer1000LifeMiles: number;
  usdPer1000Smiles: number;
};

type SavePayload = {
  baseTrm: number | null;
  usdPer1000LifeMiles: number;
  usdPer1000Smiles: number;
};

export function GlobalTrmAdminMenuItem() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [lifeMilesRate, setLifeMilesRate] = useState(String(DEFAULT_USD_PER_1000_LIFEMILES));
  const [smilesRate, setSmilesRate] = useState(String(DEFAULT_USD_PER_1000_SMILES));

  const { data, isLoading } = useQuery<GlobalTrmResponse>({
    queryKey: ["/api/settings/global-trm"],
    enabled: open,
  });

  useEffect(() => {
    if (open && data) {
      setInputValue(data.baseTrm != null ? String(data.baseTrm) : "");
      setLifeMilesRate(String(data.usdPer1000LifeMiles ?? DEFAULT_USD_PER_1000_LIFEMILES));
      setSmilesRate(String(data.usdPer1000Smiles ?? DEFAULT_USD_PER_1000_SMILES));
    }
  }, [open, data?.baseTrm, data?.usdPer1000LifeMiles, data?.usdPer1000Smiles]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      const res = await apiRequest("PUT", "/api/admin/settings/global-trm", payload);
      return res.json() as Promise<GlobalTrmResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/global-trm"] });
      toast({
        title: "Configuración guardada",
        description: "TRM y tasas de millas actualizadas correctamente.",
      });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const trimmed = inputValue.trim();
    let baseTrm: number | null = null;
    if (trimmed) {
      const n = parseFloat(trimmed.replace(/,/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        toast({
          title: "TRM inválida",
          description: "Ingresa un número mayor que cero o deja vacío para quitar la TRM.",
          variant: "destructive",
        });
        return;
      }
      baseTrm = n;
    }

    const lifeMiles = parseFloat(lifeMilesRate.replace(/,/g, ""));
    if (!Number.isFinite(lifeMiles) || lifeMiles <= 0) {
      toast({
        title: "Tasa LifeMiles inválida",
        description: "Ingresa un valor USD por 1,000 millas mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    const smiles = parseFloat(smilesRate.replace(/,/g, ""));
    if (!Number.isFinite(smiles) || smiles <= 0) {
      toast({
        title: "Tasa Smiles inválida",
        description: "Ingresa un valor USD por 1,000 millas mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      baseTrm,
      usdPer1000LifeMiles: lifeMiles,
      usdPer1000Smiles: smiles,
    });
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
          <DialogTitle>TRM y tasas de millas</DialogTitle>
          <DialogDescription>
            Configura la TRM global del cotizador y el valor USD por cada 1,000 millas para LifeMiles y Smiles.
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
              Deja el campo vacío y guarda para quitar la TRM global. Las agencias no podrán cotizar en COP hasta que configures un valor de nuevo.
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Tasas del cotizador de millas</p>
            <div className="space-y-2">
              <Label htmlFor="global-lifemiles-rate">USD por 1,000 millas — LifeMiles</Label>
              <Input
                id="global-lifemiles-rate"
                type="text"
                inputMode="decimal"
                placeholder={String(DEFAULT_USD_PER_1000_LIFEMILES)}
                value={lifeMilesRate}
                onChange={(e) => setLifeMilesRate(e.target.value)}
                disabled={isLoading || saveMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="global-smiles-rate">USD por 1,000 millas — Smiles</Label>
              <Input
                id="global-smiles-rate"
                type="text"
                inputMode="decimal"
                placeholder={String(DEFAULT_USD_PER_1000_SMILES)}
                value={smilesRate}
                onChange={(e) => setSmilesRate(e.target.value)}
                disabled={isLoading || saveMutation.isPending}
              />
            </div>
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
