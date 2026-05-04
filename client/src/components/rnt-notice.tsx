import { COMPANY_RNT_LINE } from "@/data/company-contacts";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** `default`: páginas con fondo claro (login/register). `onDark`: pie Cosmos (fondo oscuro). */
  variant?: "default" | "onDark";
};

/** RNT discreto pero legible */
export function RntNotice({ className, variant = "default" }: Props) {
  return (
    <p
      className={cn(
        "text-center text-[11px] sm:text-xs font-medium tabular-nums leading-snug",
        variant === "default" && "text-muted-foreground",
        variant === "onDark" && "text-background/75",
        className
      )}
      role="note"
    >
      {COMPANY_RNT_LINE}
    </p>
  );
}
