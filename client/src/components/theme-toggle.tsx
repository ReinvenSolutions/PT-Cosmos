import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleTheme()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTheme();
              }
            }}
            className="flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-sidebar-accent/80 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <Sun
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                !isDark ? "text-amber-500" : "text-muted-foreground/50"
              )}
            />
            <span onClick={(e) => e.stopPropagation()}>
              <Switch
                id="theme-switch-collapsed"
                checked={isDark}
                onCheckedChange={toggleTheme}
                data-testid="switch-theme"
              />
            </span>
            <Moon
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isDark ? "text-indigo-400" : "text-muted-foreground/50"
              )}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {isDark ? "Modo oscuro (clic para cambiar)" : "Modo claro (clic para cambiar)"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/80 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        {isDark ? (
          <Moon className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <Sun className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <Label
          htmlFor="theme-switch"
          className="text-sm font-medium text-sidebar-foreground cursor-pointer truncate"
        >
          {isDark ? "Modo oscuro" : "Modo claro"}
        </Label>
      </div>
      <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={toggleTheme}
        data-testid="switch-theme"
      />
    </div>
  );
}

/** Versión compacta para login/register: solo switch flotante */
export function ThemeToggleCompact() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-card/80 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
      {isDark ? (
        <Moon className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Sun className="w-4 h-4 text-muted-foreground" />
      )}
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        data-testid="switch-theme"
      />
    </div>
  );
}
