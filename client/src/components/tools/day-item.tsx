import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Save, X } from "lucide-react";
import type { DayInfo } from "@/lib/tool-itinerary-utils";
import type { EventCategory, DayDetails } from "@shared/toolItinerary";
import { categoryMetadata } from "@shared/toolItinerary";

interface DayItemProps {
  dayInfo: DayInfo;
  dayDetails: DayDetails | undefined;
  onSaveEvent: (dateKey: string, eventText: string, category?: EventCategory) => void;
  onDeleteEvent: (dateKey: string) => void;
}

export function ToolDayItem({ dayInfo, dayDetails, onSaveEvent, onDeleteEvent }: DayItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [eventText, setEventText] = useState(dayDetails?.event?.text || "");
  const [category, setCategory] = useState<EventCategory | undefined>(dayDetails?.event?.category);

  const handleSave = () => {
    const trimmedText = eventText.trim();
    if (trimmedText) {
      onSaveEvent(dayInfo.dateKey, trimmedText, category);
      setIsEditing(false);
    } else {
      handleDelete();
    }
  };

  const handleDelete = () => {
    onDeleteEvent(dayInfo.dateKey);
    setEventText("");
    setCategory(undefined);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEventText(dayDetails?.event?.text || "");
    setCategory(dayDetails?.event?.category);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const categoryData = dayDetails?.event?.category ? categoryMetadata[dayDetails.event.category] : null;

  return (
    <Card
      className={`p-4 transition-all duration-200 border-2 shadow-sm tools-day-counter-surface ${
        dayInfo.isWeekend ? "tools-day-counter-day-weekend" : ""
      }`}
      data-testid={`card-day-${dayInfo.dayNumber}`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-4">
        <div
          className="tools-day-counter-badge font-bold w-10 h-10 flex items-center justify-center rounded-full text-lg flex-shrink-0 shadow-sm"
          data-testid={`text-day-number-${dayInfo.dayNumber}`}
        >
          {dayInfo.dayNumber}
        </div>

        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {dayDetails?.event && !isEditing && (
              <Badge
                className="bg-emerald-700 dark:bg-emerald-600 text-white border-emerald-800 dark:border-emerald-500 text-sm font-semibold px-3 py-1 shadow-sm"
                data-testid={`badge-event-${dayInfo.dayNumber}`}
              >
                {categoryData && <span className="mr-1.5 text-base">{categoryData.icon}</span>}
                {dayDetails.event.text}
              </Badge>
            )}
            <div
              className="text-lg font-bold"
              data-testid={`text-day-date-${dayInfo.dayNumber}`}
            >
              {dayInfo.formattedDate}
            </div>
          </div>
          <div
            className="text-sm font-semibold tools-day-counter-text-secondary capitalize mt-0.5"
            data-testid={`text-day-weekday-${dayInfo.dayNumber}`}
          >
            {dayInfo.weekday}
          </div>
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <Button
              variant={dayDetails?.event ? "default" : "outline"}
              size="sm"
              onClick={dayDetails?.event ? handleEdit : () => setIsEditing(true)}
              className={`rounded-full whitespace-nowrap font-semibold hover-elevate active-elevate-2 ${
                !dayDetails?.event ? "tools-day-counter-outline-btn" : ""
              }`}
              data-testid={`button-${dayDetails?.event ? "edit" : "add"}-event-${dayInfo.dayNumber}`}
            >
              {dayDetails?.event ? (
                <>
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="col-span-3 flex flex-col gap-2">
            <Input
              value={eventText}
              onChange={(e) => setEventText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe el evento..."
              autoFocus
              data-testid={`input-event-${dayInfo.dayNumber}`}
            />
            <div className="flex gap-2 flex-wrap">
              <Select value={category} onValueChange={(val) => setCategory(val as EventCategory)}>
                <SelectTrigger className="flex-1 min-w-[150px]" data-testid={`select-category-${dayInfo.dayNumber}`}>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryMetadata).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  variant="default"
                  className="hover-elevate active-elevate-2"
                  data-testid={`button-save-event-${dayInfo.dayNumber}`}
                >
                  <Save className="h-3 w-3" />
                </Button>
                {dayDetails?.event && (
                  <Button
                    size="sm"
                    onClick={handleDelete}
                    variant="destructive"
                    className="hover-elevate active-elevate-2"
                    data-testid={`button-delete-event-${dayInfo.dayNumber}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleCancel}
                  variant="outline"
                  className="hover-elevate active-elevate-2"
                  data-testid={`button-cancel-event-${dayInfo.dayNumber}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
