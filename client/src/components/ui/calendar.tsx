import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { dateToYmd, type AvailabilityDay } from "@shared/availability"

function slotBadgeClass(slots: number): string {
  if (slots <= 0) return "bg-gray-400 text-white";
  if (slots <= 3) return "bg-red-600 text-white";
  if (slots <= 7) return "bg-orange-500 text-white";
  if (slots <= 15) return "bg-yellow-400 text-yellow-950";
  return "bg-emerald-600 text-white";
}

const PLAN_DOTS = [
  "bg-sky-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-indigo-500",
];

type DayLine = {
  name?: string;
  slots?: number;
  price?: string;
  flightLabel?: string;
};

function formatCalendarPrice(price: string): string {
  const amount = Number.parseFloat(price);
  if (!Number.isFinite(amount)) return price;
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

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
  availability?: AvailabilityDay[];
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  numberOfMonths = 2,
  priceTiers,
  availability,
  components,
  modifiers,
  modifiersClassNames,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  ...props
}: CalendarProps) {
  const isDualView = numberOfMonths === 2;
  const [month, setMonth] = React.useState<Date>(() =>
    startOfMonth(monthProp ?? defaultMonth ?? new Date()),
  );
  const displayedMonth = startOfMonth(monthProp ?? month);

  const goToMonth = (next: Date) => {
    const normalized = startOfMonth(next);
    if (monthProp == null) setMonth(normalized);
    onMonthChange?.(normalized);
  };

  const getDateString = (date: Date): string => dateToYmd(date);

  const availabilityByDate = new Map<string, AvailabilityDay[]>();
  for (const day of availability ?? []) {
    const list = availabilityByDate.get(day.date) ?? [];
    list.push(day);
    availabilityByDate.set(day.date, list);
  }

  const planNames = Array.from(
    new Set(
      [
        ...(availability ?? []).map((day) => day.destinationName).filter(Boolean),
        ...(priceTiers ?? []).map((tier) => tier.destinationName).filter(Boolean),
      ] as string[],
    ),
  );
  const showPlanNames = planNames.length > 1;
  const plansWithDepartures = new Set((availability ?? []).map((day) => day.destinationName ?? ""));

  const tiersForDate = (dateStr: string): PriceTier[] => {
    if (!priceTiers?.length) return [];
    const exactMatches = priceTiers.filter((tier) => tier.endDate === dateStr && !tier.startDate);
    if (exactMatches.length > 0) return exactMatches;
    const ranged = priceTiers.filter(
      (tier) => !!tier.startDate && dateStr >= tier.startDate && dateStr <= tier.endDate,
    );
    return ranged;
  };

  const linesForDate = (date: Date): DayLine[] => {
    const dateStr = getDateString(date);
    const byName = new Map<string, DayLine>();

    for (const mark of availabilityByDate.get(dateStr) ?? []) {
      const key = mark.destinationName ?? "";
      const line = byName.get(key) ?? { name: mark.destinationName };
      if (line.slots == null || mark.slots < line.slots) line.slots = mark.slots;
      if (mark.price) line.price = mark.price;
      byName.set(key, line);
    }

    for (const tier of tiersForDate(dateStr)) {
      const key = tier.destinationName ?? "";
      const hasDepartures = plansWithDepartures.has(key);
      const isExact = !tier.startDate && tier.endDate === dateStr;
      if (hasDepartures && !byName.has(key) && !isExact) continue;
      const line = byName.get(key) ?? { name: tier.destinationName };
      if (!line.price) line.price = tier.price;
      if (tier.isFlightDay) line.flightLabel = tier.flightLabel || "Vuelo COL";
      byName.set(key, line);
    }

    return Array.from(byName.values()).filter(
      (line) => line.slots != null || line.price || line.flightLabel,
    );
  };

  const getPrice = (date: Date) => linesForDate(date).find((line) => line.price)?.price ?? null;
  
  const dense = (availability?.length ?? 0) > 0 || (priceTiers?.length ?? 0) > 0;

  return (
    <div className="relative w-full max-w-full overflow-hidden">
      {showPlanNames ? (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-foreground">
          {planNames.map((name, index) => (
            <li key={name} className="flex items-center gap-1.5 font-medium">
              <span className={cn("h-2.5 w-2.5 rounded-full", PLAN_DOTS[index % PLAN_DOTS.length])} />
              {name}
            </li>
          ))}
        </ul>
      ) : null}
      {isDualView && (
        <div className={cn(
          "absolute left-0 right-0 flex justify-between px-4 pointer-events-none z-20 w-full",
          showPlanNames ? "top-12" : "top-4",
        )}>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-9 rounded-full bg-white dark:bg-gray-800 p-0 opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md border-gray-200 dark:border-gray-600 pointer-events-auto transition-transform hover:scale-105"
            )}
            aria-label="Mes anterior"
            onClick={() => {
              goToMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1));
            }}
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 w-9 rounded-full bg-white dark:bg-gray-800 p-0 opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md border-gray-200 dark:border-gray-600 pointer-events-auto transition-transform hover:scale-105"
            )}
            aria-label="Mes siguiente"
            onClick={() => {
              goToMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1));
            }}
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>
      )}
      <DayPicker
        showOutsideDays={showOutsideDays}
        numberOfMonths={numberOfMonths}
        month={displayedMonth}
        onMonthChange={goToMonth}
        className={cn("p-3", isDualView && "w-full flex justify-center", className)}
        classNames={{
          months: cn(
            "flex flex-col space-y-4 justify-center",
            !showPlanNames && "sm:flex-row sm:space-x-8 sm:space-y-0",
          ),
          month: cn("space-y-4", showPlanNames && "w-full max-w-3xl mx-auto"),
          caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-base font-semibold text-gray-800 dark:text-gray-100",
          nav: "hidden",
          nav_button: "hidden",
          nav_button_previous: "hidden",
          nav_button_next: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex w-full mb-2",
          head_cell: cn(
            "text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase tracking-wider text-center",
            showPlanNames ? "flex-1" : dense ? "w-16" : "w-12",
          ),
          row: "flex w-full mt-1.5",
          cell: cn(
            "text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            showPlanNames ? "flex-1 h-auto" : dense ? "h-[4.85rem] w-16" : "h-14 w-12",
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "w-full whitespace-normal p-0.5 font-normal aria-selected:opacity-100 flex flex-col items-center justify-center gap-0.5 group transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg",
            showPlanNames ? "h-auto min-h-[4.5rem] py-1" : dense ? "h-[4.85rem] w-16" : "h-14 w-12",
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-md z-10",
          day_today: "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-100 dark:border-blue-700",
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
          DayContent: ({ date }) => {
             const lines = linesForDate(date);
             const title = lines
               .map((line) => {
                 const who = line.name ? `${line.name}: ` : "";
                 const money = line.price ? formatCalendarPrice(line.price) : "";
                 const slots = line.slots != null ? `${line.slots} cupos` : "";
                 const flight = line.flightLabel ? line.flightLabel : "";
                 return [who, [money, slots, flight].filter(Boolean).join(" · ")].join("").trim();
               })
               .join("\n");

             return (
                <div
                  className="flex w-full flex-col items-center justify-center gap-0.5 px-0.5"
                  title={title}
                >
                   <span className="text-sm font-semibold leading-none group-aria-selected:font-bold">{date.getDate()}</span>
                   {showPlanNames ? (
                     lines.map((line) => {
                       const dot = PLAN_DOTS[Math.max(0, planNames.indexOf(line.name ?? "")) % PLAN_DOTS.length];
                       return (
                         <span key={line.name ?? "plan"} className="flex w-full max-w-full flex-col items-center gap-0.5 leading-none">
                           {line.name ? (
                             <span className="flex max-w-full items-center gap-1">
                               <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
                               <span className="truncate text-[0.62rem] font-medium">{line.name}</span>
                             </span>
                           ) : null}
                           <span className="flex items-center gap-1">
                             {line.flightLabel ? (
                               <span className="truncate text-[0.6rem] font-semibold text-sky-600 dark:text-sky-300 group-aria-selected:text-primary-foreground">
                                 {line.flightLabel}
                               </span>
                             ) : null}
                             {line.price ? (
                               <span className="text-[0.78rem] font-extrabold tabular-nums text-price-accent group-aria-selected:text-primary-foreground">
                                 {formatCalendarPrice(line.price)}
                               </span>
                             ) : null}
                             {line.slots != null ? (
                               <span className={cn(
                                 "rounded px-1 py-0.5 text-[0.62rem] font-bold leading-none",
                                 slotBadgeClass(line.slots),
                               )}>
                                 {line.slots}
                               </span>
                             ) : null}
                           </span>
                         </span>
                       );
                     })
                   ) : lines[0]?.flightLabel && lines[0].slots == null && !lines[0].price ? (
                     <span className="rounded-md bg-sky-600 px-1 py-0.5 text-[0.62rem] font-semibold leading-none text-white">
                       {lines[0].flightLabel}
                     </span>
                   ) : lines[0] ? (
                     <>
                       {lines[0].price ? (
                         <span className="text-[0.8rem] font-extrabold leading-none tabular-nums text-price-accent group-aria-selected:text-primary-foreground">
                           {formatCalendarPrice(lines[0].price)}
                         </span>
                       ) : null}
                       {lines[0].slots != null ? (
                         <span className={cn(
                           "rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold leading-none shadow-sm",
                           slotBadgeClass(lines[0].slots),
                         )}>
                           {lines[0].slots}
                         </span>
                       ) : null}
                       {lines[0].flightLabel ? (
                         <span className="text-[0.58rem] font-semibold leading-none text-sky-600 dark:text-sky-300 group-aria-selected:text-primary-foreground">
                           {lines[0].flightLabel}
                         </span>
                       ) : null}
                     </>
                   ) : null}
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
