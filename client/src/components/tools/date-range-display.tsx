import { getEndDate } from "@/lib/tool-itinerary-utils";

interface DateRangeDisplayProps {
  startDate: Date | null;
}

export function ToolDateRangeDisplay({ startDate }: DateRangeDisplayProps) {
  if (!startDate) {
    return (
      <div
        className="text-center text-base font-semibold p-4 rounded-xl tools-day-counter-date-empty"
        data-testid="text-date-range"
      >
        Selecciona una fecha de inicio
      </div>
    );
  }

  const endDate = getEndDate(startDate);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      className="text-center p-4 rounded-xl shadow-sm tools-day-counter-date-filled"
      data-testid="text-date-range"
    >
      <div className="text-xs uppercase tracking-wider mb-1.5 tools-day-counter-date-label">
        Itinerario de 25 días
      </div>
      <div className="text-lg font-bold">
        {formatDate(startDate)} — {formatDate(endDate)}
      </div>
    </div>
  );
}
