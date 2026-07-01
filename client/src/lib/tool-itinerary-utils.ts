import { DAYS_IN_TRIP } from "@shared/toolItinerary";

export interface DayInfo {
  dayNumber: number;
  date: Date;
  dateKey: string;
  formattedDate: string;
  weekday: string;
  isWeekend: boolean;
}

export function getFormattedDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateItineraryDays(startDate: Date): DayInfo[] {
  const days: DayInfo[] = [];

  for (let dayCount = 1; dayCount <= DAYS_IN_TRIP; dayCount++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + (dayCount - 1));

    const dateKey = getFormattedDateKey(currentDate);
    const formattedDate = currentDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const weekday = currentDate.toLocaleDateString("es-ES", {
      weekday: "long",
    });
    const isWeekend = [0, 6].includes(currentDate.getDay());

    days.push({
      dayNumber: dayCount,
      date: currentDate,
      dateKey,
      formattedDate,
      weekday,
      isWeekend,
    });
  }

  return days;
}

export function getEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (DAYS_IN_TRIP - 1));
  return endDate;
}
