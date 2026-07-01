import { ToolDayItem } from "./day-item";
import type { DayInfo } from "@/lib/tool-itinerary-utils";
import type { DayDetails, EventCategory } from "@shared/toolItinerary";

interface TimelineProps {
  days: DayInfo[];
  dayDetails: Record<string, DayDetails>;
  onSaveEvent: (dateKey: string, eventText: string, category?: EventCategory) => void;
  onDeleteEvent: (dateKey: string) => void;
}

export function ToolTimeline({ days, dayDetails, onSaveEvent, onDeleteEvent }: TimelineProps) {
  return (
    <div className="rounded-2xl shadow-lg overflow-hidden tools-day-counter-surface">
      <div className="sticky top-0 z-10 tools-day-counter-timeline-header">
        <h3 className="text-xl font-bold p-5 md:p-6">Itinerario Detallado</h3>
      </div>
      <div
        className="max-h-[80vh] md:max-h-[80vh] overflow-y-auto p-4 space-y-3 tools-day-counter-timeline-body scrollbar-thin"
        data-testid="container-timeline"
      >
        {days.map((dayInfo) => (
          <ToolDayItem
            key={dayInfo.dateKey}
            dayInfo={dayInfo}
            dayDetails={dayDetails[dayInfo.dateKey]}
            onSaveEvent={onSaveEvent}
            onDeleteEvent={onDeleteEvent}
          />
        ))}
      </div>
    </div>
  );
}
