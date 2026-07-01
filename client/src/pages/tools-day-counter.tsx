import { useToolItinerary } from "@/hooks/use-tool-itinerary";
import { generateItineraryDays } from "@/lib/tool-itinerary-utils";
import { ToolCalendarPicker } from "@/components/tools/calendar-picker";
import { ToolDateRangeDisplay } from "@/components/tools/date-range-display";
import { ToolSummaryPanel } from "@/components/tools/summary-panel";
import { ToolTimeline } from "@/components/tools/timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw, Loader2 } from "lucide-react";
import "@/styles/tools-day-counter.css";

export default function ToolsDayCounter() {
  const {
    startDate,
    days,
    isLoading,
    isSaving,
    setStartDate,
    setEvent,
    deleteEvent,
    clearItinerary,
  } = useToolItinerary();

  const startDateObj = startDate ? new Date(startDate + "T00:00:00") : null;
  const itineraryDays = startDateObj ? generateItineraryDays(startDateObj) : [];

  const handleDateChange = (date: Date) => {
    setStartDate(date);
  };

  if (isLoading) {
    return (
      <div className="tools-day-counter-page min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <header className="max-w-2xl mx-auto text-center mb-12">
            <Skeleton className="h-14 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-6 w-full" />
          </header>
          <div className="grid md:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
            <Card className="p-6 tools-day-counter-surface">
              <Skeleton className="h-96 w-full" />
            </Card>
            <Card className="p-6 tools-day-counter-surface">
              <Skeleton className="h-96 w-full" />
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="tools-day-counter-page min-h-screen">
      {isSaving && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 tools-day-counter-badge px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-semibold">Guardando...</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <header className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">
            Calculadora de Días{" "}
            <span className="tools-day-counter-stat-value">Cosmos</span>
          </h1>
          <div className="inline-block text-lg md:text-xl font-bold tools-day-counter-badge px-5 py-2 rounded-full mb-4 shadow-md">
            25 Días · 24 Noches
          </div>
          <p className="text-lg tools-day-counter-text-secondary">
            Selecciona la fecha de inicio para ver tu itinerario fijo de{" "}
            <strong className="font-bold">25 días / 24 noches</strong>.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-start max-w-6xl mx-auto">
          <div>
            <Card className="p-6 shadow-lg tools-day-counter-surface rounded-2xl">
              <label
                className="block text-xl font-bold mb-4 text-center"
                htmlFor="calendar-picker"
              >
                Selecciona Fecha de Inicio
              </label>

              <ToolDateRangeDisplay startDate={startDateObj} />

              <div className="mt-6 max-w-md mx-auto">
                <ToolCalendarPicker selectedDate={startDateObj} onDateChange={handleDateChange} />
              </div>

              <Button
                onClick={clearItinerary}
                variant="outline"
                className="mt-4 w-full font-semibold tools-day-counter-outline-btn hover-elevate active-elevate-2"
                data-testid="button-clear-itinerary"
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar y Reiniciar Itinerario
              </Button>

              <ToolSummaryPanel hasStartDate={!!startDateObj} />
            </Card>
          </div>

          <div>
            {itineraryDays.length > 0 ? (
              <ToolTimeline
                days={itineraryDays}
                dayDetails={days}
                onSaveEvent={setEvent}
                onDeleteEvent={deleteEvent}
              />
            ) : (
              <Card className="p-12 text-center shadow-lg tools-day-counter-surface rounded-2xl">
                <p className="text-lg font-semibold tools-day-counter-empty-state">
                  Selecciona una fecha de inicio para ver tu itinerario
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
