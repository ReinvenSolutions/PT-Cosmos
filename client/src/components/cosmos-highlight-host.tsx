import { useEffect } from "react";
import { COSMOS_HIGHLIGHT_EVENT } from "@/lib/cosmos-actions";

function focusHighlighted(el: HTMLElement) {
  const focusable = el.matches("input, textarea, select, button")
    ? el
    : el.querySelector<HTMLElement>("input, textarea, select, button, [role='combobox']");
  focusable?.focus({ preventScroll: true });
}

export function CosmosHighlightHost() {
  useEffect(() => {
    let retryTimer = 0;
    let clearTimer = 0;
    const onHighlight = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: string; query?: string }>).detail;
      const target = detail?.target;
      if (!target) return;
      window.clearTimeout(retryTimer);
      window.clearTimeout(clearTimer);
      document.querySelectorAll(".cosmos-highlighted").forEach((node) => {
        node.classList.remove("cosmos-highlighted");
      });
      const run = () => {
        const el = document.querySelector(`[data-cosmos-target="${CSS.escape(target)}"]`);
        if (!(el instanceof HTMLElement)) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("cosmos-highlighted");
        focusHighlighted(el);
        window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(() => el.classList.remove("cosmos-highlighted"), 3200);
      };
      run();
      retryTimer = window.setTimeout(run, 250);
    };
    window.addEventListener(COSMOS_HIGHLIGHT_EVENT, onHighlight);
    return () => {
      window.clearTimeout(retryTimer);
      window.clearTimeout(clearTimer);
      window.removeEventListener(COSMOS_HIGHLIGHT_EVENT, onHighlight);
    };
  }, []);
  return null;
}
