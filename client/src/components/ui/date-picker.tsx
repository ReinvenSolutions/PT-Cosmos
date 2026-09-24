import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, type PriceTier } from "@/components/ui/calendar";
import type { AvailabilityDay } from "@shared/availability";
import { AvailabilityLegend } from "@/components/availability-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  priceTiers?: PriceTier[];
  availability?: AvailabilityDay[];
  presentation?: "popover" | "inline";
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Selecciona una fecha",
  disabled,
  className,
  priceTiers,
  availability,
  presentation = "popover",
}: DatePickerProps) {
  const today = new Date();

  const calendar = (
    <>
      {(availability?.length ?? 0) > 0 ? (
        <div className={cn("border-b px-3 py-2", presentation === "inline" && "px-0")}>
          <AvailabilityLegend />
        </div>
      ) : null}
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateChange}
        disabled={disabled}
        initialFocus={presentation === "popover"}
        locale={es}
        numberOfMonths={2}
        defaultMonth={date || today}
        priceTiers={priceTiers}
        availability={availability}
      />
    </>
  );

  if (presentation === "inline") {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-2", className)}>
        {calendar}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          data-testid="button-date-picker"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[95vw] p-0" align="start">
        {calendar}
      </PopoverContent>
    </Popover>
  );
}
