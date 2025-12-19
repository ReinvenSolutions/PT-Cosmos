import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { isSameDay, parseISO } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface PriceTier {
  startDate?: string;
  endDate: string;
  price: string;
  destinationName?: string;
  isFlightDay?: boolean; // Para días de vuelo desde Colombia (Turquía)
  flightLabel?: string; // Etiqueta personalizada para días de vuelo
}

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  priceTiers?: PriceTier[];
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  numberOfMonths = 2,
  priceTiers,
  components,
  modifiers,
  modifiersClassNames,
  ...props
}: CalendarProps) {
  const isDualView = numberOfMonths === 2;

  const getPrice = (date: Date) => {
    if (!priceTiers?.length) return null;
    const tier = priceTiers.find(tier => {
        // Support both startDate and endDate (fallback for legacy data)
        const dateToCheck = tier.startDate || tier.endDate;
        if (!dateToCheck) return false;
        try {
            const tierDate = parseISO(dateToCheck);
            return isSameDay(date, tierDate);
        } catch {
            return false;
        }
    });
    return tier?.price;
  };

  const getPricesForDate = (date: Date) => {
    if (!priceTiers?.length) return [];
    return priceTiers.filter(tier => {
        // Support both startDate and endDate (fallback for legacy data)
        const dateToCheck = tier.startDate || tier.endDate;
        if (!dateToCheck) return false;
        try {
            const tierDate = parseISO(dateToCheck);
            return isSameDay(date, tierDate);
        } catch {
            return false;
        }
    });
  };
  
  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {isDualView && (
        <div className="absolute top-4 left-0 right-0 flex justify-between px-4 pointer-events-none z-20 w-full">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-9 rounded-full bg-white p-0 opacity-100 hover:bg-gray-100 shadow-md border-gray-200 pointer-events-auto transition-transform hover:scale-105"
            )}
            onClick={(e) => {
              const prevButton = e.currentTarget.closest('.relative')?.querySelector('[name="previous-month"]') as HTMLButtonElement;
              prevButton?.click();
            }}
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-9 rounded-full bg-white p-0 opacity-100 hover:bg-gray-100 shadow-md border-gray-200 pointer-events-auto transition-transform hover:scale-105"
            )}
            onClick={(e) => {
              const nextButton = e.currentTarget.closest('.relative')?.querySelector('[name="next-month"]') as HTMLButtonElement;
              nextButton?.click();
            }}
          >
            <ChevronRight className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      )}
      <DayPicker
        showOutsideDays={showOutsideDays}
        numberOfMonths={numberOfMonths}
        className={cn("p-3", isDualView && "w-full flex justify-center", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-12 sm:space-y-0 justify-center",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-base font-semibold text-gray-800",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex justify-between mb-2",
          head_cell:
            "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem] uppercase tracking-wider",
          row: "flex w-full mt-2 justify-between",
          cell: "h-14 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-14 w-12 p-0 font-normal aria-selected:opacity-100 flex flex-col items-center justify-center gap-1 group transition-all duration-200 hover:bg-gray-100 rounded-lg"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md scale-105 z-10",
          day_today: "bg-blue-50 text-blue-700 font-semibold border border-blue-100",
          day_outside:
            "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ className, ...props }) => (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
          ),
          IconRight: ({ className, ...props }) => (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          ),
          DayContent: ({ date, ...props }) => {
             const price = getPrice(date);
             const allPrices = getPricesForDate(date);
             const flightDayInfo = allPrices.find(p => p.isFlightDay);
             const formattedPrice = price ? `$${Math.round(parseFloat(price)).toLocaleString('es-CO')}` : null;
             
             return (
                <div 
                  className="flex flex-col items-center justify-center w-full h-full relative group/day"
                  title={allPrices.length > 1 ? allPrices.map(p => `${p.destinationName || 'Destino'}: $${Math.round(parseFloat(p.price)).toLocaleString('es-CO')}`).join('\n') : ''}
                >
                   <span className="text-sm font-medium group-aria-selected:font-bold">{date.getDate()}</span>
                   {flightDayInfo ? (
                     <span className="text-[0.6rem] bg-blue-600 text-white px-1 py-0.5 rounded-md leading-none font-medium shadow-sm group-aria-selected:bg-white group-aria-selected:text-primary transition-colors whitespace-nowrap">
                       {flightDayInfo.flightLabel || '🛫 COL'}
                     </span>
                   ) : formattedPrice ? (
                     <span className="text-[0.65rem] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md leading-none font-medium shadow-sm group-aria-selected:bg-white group-aria-selected:text-primary group-aria-selected:shadow-none transition-colors">
                       {formattedPrice}
                     </span>
                   ) : null}
                   {allPrices.length > 1 && !flightDayInfo && (
                     <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[0.5rem] rounded-full flex items-center justify-center font-bold shadow-sm">
                       {allPrices.length}
                     </span>
                   )}
                </div>
             );
          },
          ...components,
        }}
        modifiers={{
            hasPrice: (date) => !!getPrice(date),
            ...modifiers
        }}
        modifiersClassNames={{
            ...modifiersClassNames
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
