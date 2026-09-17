import { Button } from "@/components/ui/button";
import type { CosmosExecutableAction } from "@shared/cosmosAgent";

export type CosmosProposal = {
  id: string;
  label: string;
  action: CosmosExecutableAction;
  status: "pending" | "accepted" | "dismissed";
};

export function CosmosProposalCard({
  proposal,
  onAccept,
  onDismiss,
}: {
  proposal: CosmosProposal;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (proposal.status !== "pending") {
    return (
      <p className="text-[11px] text-muted-foreground px-1">
        {proposal.status === "accepted" ? `Listo: ${proposal.label}` : `Omitido: ${proposal.label}`}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-orange-200/80 bg-orange-50/80 dark:bg-orange-950/30 dark:border-orange-800/60 px-3 py-2.5 space-y-2">
      <p className="text-sm font-medium text-foreground leading-snug">{proposal.label}</p>
      <p className="text-[11px] text-muted-foreground">¿Te llevo ahora?</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8" onClick={onAccept}>
          Ir
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onDismiss}>
          Ahora no
        </Button>
      </div>
    </div>
  );
}
