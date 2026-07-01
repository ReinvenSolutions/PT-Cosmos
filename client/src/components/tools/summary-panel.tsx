import { DAYS_IN_TRIP, NIGHTS_IN_TRIP } from "@shared/toolItinerary";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryPanelProps {
  hasStartDate: boolean;
}

export function ToolSummaryPanel({ hasStartDate }: SummaryPanelProps) {
  return (
    <div className="mt-8 rounded-xl tools-day-counter-surface-muted overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-lg font-bold text-center">Resumen del Viaje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 rounded-xl shadow-sm tools-day-counter-stat-box">
            <p className="text-3xl font-extrabold tools-day-counter-stat-value" data-testid="text-days-total">
              {DAYS_IN_TRIP}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide tools-day-counter-text-secondary mt-1.5">
              Días Totales
            </p>
          </div>

          <div className="text-center p-4 rounded-xl shadow-sm tools-day-counter-stat-box">
            <p className="text-3xl font-extrabold tools-day-counter-stat-value" data-testid="text-nights-total">
              {NIGHTS_IN_TRIP}
            </p>
            <p className="text-xs font-bold uppercase tracking-wide tools-day-counter-text-secondary mt-1.5">
              Noches Totales
            </p>
          </div>
        </div>

        <p
          className={`text-sm font-semibold mt-4 text-center ${
            hasStartDate ? "tools-day-counter-stat-value" : "tools-day-counter-text-secondary"
          }`}
          data-testid="text-status-message"
        >
          {hasStartDate ? "Itinerario listo para personalizar" : "Selecciona una fecha para comenzar"}
        </p>
      </CardContent>
    </div>
  );
}
