import {
  formatCosmosQuoteMoney,
  isCosmosProposal,
  primaryQuoteHighlightTarget,
  type CosmosClientAction,
  type CosmosExecutableAction,
  type CosmosMoneyCurrency,
  type CosmosQuotePatch,
} from "@shared/cosmosAgent";
import { clearHomeBuilderSelection } from "@/lib/home-selection-storage";
import {
  invalidateAdminDestinationQueries,
  invalidatePublicDestinationQueries,
  queryClient,
} from "@/lib/queryClient";

export const COSMOS_QUOTE_PREFILL_EVENT = "cosmos-quote-prefill";
export const COSMOS_QUOTE_PATCH_EVENT = "cosmos-quote-patch";
export const COSMOS_HIGHLIGHT_EVENT = "cosmos-highlight";
export const COSMOS_CATALOG_SEARCH_EVENT = "cosmos-catalog-search";
export const COSMOS_QUOTE_SAVE_EVENT = "cosmos-quote-save";
export const COSMOS_QUOTE_RESET_EVENT = "cosmos-quote-reset";
export const COSMOS_QUOTE_COMMAND_KEY = "cosmosQuoteCommand";
export const COSMOS_QUOTE_CLEARED_KEY = "cosmosQuoteCleared";

export type CosmosQuoteSaveCommand = {
  type: "save";
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  thenReset?: boolean;
};

export type CosmosQuoteCommand = CosmosQuoteSaveCommand | { type: "reset" };

function moneyField(amount: number | undefined, currency: CosmosMoneyCurrency | undefined) {
  if (amount == null) return undefined;
  return formatCosmosQuoteMoney(amount, currency ?? "USD");
}

export function isQuoteDraftCleared(): boolean {
  try {
    return sessionStorage.getItem(COSMOS_QUOTE_CLEARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function allowQuoteDraftWrites() {
  try {
    sessionStorage.removeItem(COSMOS_QUOTE_CLEARED_KEY);
  } catch {
    /* ignore */
  }
}

export function clearQuoteDraft() {
  try {
    sessionStorage.removeItem("quoteData");
    sessionStorage.setItem(COSMOS_QUOTE_CLEARED_KEY, "1");
    sessionStorage.removeItem(COSMOS_QUOTE_COMMAND_KEY);
    clearHomeBuilderSelection();
  } catch {
    /* ignore quota */
  }
}

export function writeCosmosQuoteCommand(command: CosmosQuoteCommand) {
  try {
    sessionStorage.setItem(COSMOS_QUOTE_COMMAND_KEY, JSON.stringify(command));
  } catch {
    /* ignore */
  }
}

export function takeCosmosQuoteCommand(): CosmosQuoteCommand | null {
  try {
    const raw = sessionStorage.getItem(COSMOS_QUOTE_COMMAND_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(COSMOS_QUOTE_COMMAND_KEY);
    const parsed = JSON.parse(raw) as CosmosQuoteCommand;
    if (parsed?.type === "save" || parsed?.type === "reset") return parsed;
    return null;
  } catch {
    return null;
  }
}

function mergeQuoteSession(patch: CosmosQuotePatch & { destinations?: string[] }, replace = false) {
  try {
    allowQuoteDraftWrites();
    const raw = replace ? null : sessionStorage.getItem("quoteData");
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const destinations = patch.planIds ?? patch.destinations ?? base.destinations;
    const flightsCurrency = patch.flightsCurrency ?? (base.flightsCurrency as CosmosMoneyCurrency | undefined);
    const assistanceCurrency =
      patch.assistanceCurrency ?? (base.assistanceCurrency as CosmosMoneyCurrency | undefined);
    const finalPriceCurrency =
      patch.finalPriceCurrency ?? (base.finalPriceCurrency as CosmosMoneyCurrency | undefined);
    const nextFinalPrice = moneyField(patch.finalPrice, finalPriceCurrency) ?? base.finalPrice;
    let nextMinPayment = moneyField(patch.minPayment, finalPriceCurrency) ?? base.minPayment;
    if (patch.minPayment == null && patch.minPaymentPercent != null && typeof nextFinalPrice === "string") {
      const rawFinal = parseFloat(nextFinalPrice.replace(/,/g, "")) || 0;
      if (rawFinal > 0) {
        nextMinPayment = formatCosmosQuoteMoney(
          rawFinal * (patch.minPaymentPercent / 100),
          finalPriceCurrency ?? "USD"
        );
      }
    }
    sessionStorage.setItem(
      "quoteData",
      JSON.stringify({
        ...(replace ? {} : base),
        destinations,
        startDate: patch.startDate ?? (replace ? "" : base.startDate) ?? "",
        passengers: patch.passengers ?? (replace ? undefined : base.passengers),
        originCity: patch.originCity ?? (replace ? undefined : base.originCity),
        flightsCost: moneyField(patch.flightsCost, flightsCurrency) ?? (replace ? undefined : base.flightsCost),
        flightsCurrency: patch.flightsCurrency ?? (replace ? undefined : base.flightsCurrency),
        assistanceCost:
          moneyField(patch.assistanceCost, assistanceCurrency) ?? (replace ? undefined : base.assistanceCost),
        assistanceCurrency: patch.assistanceCurrency ?? (replace ? undefined : base.assistanceCurrency),
        finalPrice: replace && patch.finalPrice == null ? undefined : nextFinalPrice,
        finalPriceCurrency: patch.finalPriceCurrency ?? (replace ? undefined : base.finalPriceCurrency),
        minPayment: replace && patch.minPayment == null ? undefined : nextMinPayment,
        minPaymentPercent: patch.minPaymentPercent ?? (replace ? undefined : base.minPaymentPercent),
        customFilename: patch.customFilename ?? (replace ? undefined : base.customFilename),
        selectedUpgrades: patch.selectedUpgrades ?? (replace ? undefined : base.selectedUpgrades),
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function dispatchHighlight(target: string, query?: string) {
  window.dispatchEvent(
    new CustomEvent(COSMOS_HIGHLIGHT_EVENT, { detail: { target, query } })
  );
  if (target === "catalog.search" && query) {
    window.dispatchEvent(new CustomEvent(COSMOS_CATALOG_SEARCH_EVENT, { detail: { query } }));
  }
}

function highlightQuotePatch(patch: CosmosQuotePatch) {
  const target = primaryQuoteHighlightTarget(patch);
  if (target) dispatchHighlight(target);
}

function resetQuoteAndGoHome(navigate: (path: string) => void) {
  clearQuoteDraft();
  window.dispatchEvent(new CustomEvent(COSMOS_QUOTE_RESET_EVENT));
  navigate("/");
}

export function applyCosmosExecutableAction(
  action: CosmosExecutableAction,
  navigate: (path: string) => void
): void {
  if (action.type === "open_plan") {
    navigate(`/plan/${action.planId}`);
    return;
  }
  if (action.type === "start_quote") {
    mergeQuoteSession(
      { planIds: action.planIds, startDate: action.startDate },
      action.replace === true
    );
    window.dispatchEvent(
      new CustomEvent(COSMOS_QUOTE_PREFILL_EVENT, {
        detail: {
          destinations: action.planIds,
          startDate: action.startDate ?? "",
          replace: action.replace === true,
        },
      })
    );
    navigate("/cotizacion");
    return;
  }
  if (action.type === "navigate") {
    navigate(action.path);
    return;
  }
  if (action.type === "highlight") {
    if (action.target === "catalog.search") {
      navigate("/");
      window.setTimeout(() => dispatchHighlight(action.target, action.query), 180);
      return;
    }
    if (action.target.startsWith("quote.") && !window.location.pathname.startsWith("/cotizacion")) {
      navigate("/cotizacion");
      window.setTimeout(() => dispatchHighlight(action.target, action.query), 220);
      return;
    }
    if (action.target.startsWith("plan.") && !window.location.pathname.startsWith("/plan/")) {
      dispatchHighlight(action.target, action.query);
      return;
    }
    dispatchHighlight(action.target, action.query);
    return;
  }
  if (action.type === "patch_quote") {
    mergeQuoteSession(action.patch);
    window.dispatchEvent(new CustomEvent(COSMOS_QUOTE_PATCH_EVENT, { detail: action.patch }));
    const onQuotePage = window.location.pathname.startsWith("/cotizacion");
    if (!onQuotePage) {
      navigate("/cotizacion");
      window.setTimeout(() => highlightQuotePatch(action.patch), 280);
    } else {
      highlightQuotePatch(action.patch);
    }
    return;
  }
  if (action.type === "save_quote") {
    const command: CosmosQuoteSaveCommand = {
      type: "save",
      clientId: action.clientId,
      clientName: action.clientName,
      clientEmail: action.clientEmail,
      thenReset: action.thenReset,
    };
    writeCosmosQuoteCommand(command);
    const onQuotePage = window.location.pathname.startsWith("/cotizacion");
    if (!onQuotePage) navigate("/cotizacion");
    window.setTimeout(
      () => window.dispatchEvent(new CustomEvent(COSMOS_QUOTE_SAVE_EVENT, { detail: command })),
      onQuotePage ? 0 : 280
    );
    return;
  }
  if (action.type === "reset_quote") {
    resetQuoteAndGoHome(navigate);
    return;
  }
  if (action.type === "refresh_admin") {
    if (action.scope === "users" || action.scope === "all") {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending-approval-count"] });
    }
    if (action.scope === "plans" || action.scope === "all") {
      invalidateAdminDestinationQueries(queryClient);
      invalidatePublicDestinationQueries(queryClient);
    }
    if (action.scope === "dashboard" || action.scope === "all") {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes/stats"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes/recent?limit=8"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/top-destinations?limit=8"] });
      void queryClient.invalidateQueries({
        queryKey: ["/api/admin/analytics/top-destinations-by-amount?limit=8"],
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/cosmos-sessions/stats"] });
    }
  }
}

export function applyCosmosClientAction(
  action: CosmosClientAction,
  navigate: (path: string) => void
): void {
  if (isCosmosProposal(action)) return;
  applyCosmosExecutableAction(action, navigate);
}
