// Turkey National and Religious Holidays 2026
// Based on official Turkish holiday calendar

export interface TurkeyHoliday {
  date: Date;
  description: string;
}

export const turkeyHolidays2026: TurkeyHoliday[] = [
  {
    date: new Date(2026, 0, 1), // January 1
    description: "Feriado de año nuevo. Los bazares están cerrados."
  },
  {
    date: new Date(2026, 2, 30), // March 30
    description: "1º día del feriado religioso, no se harán visitas (bazares y algunos museos cerrados)."
  },
  {
    date: new Date(2026, 2, 31), // March 31
    description: "Feriado religioso, se realizan visitas pero el gran bazar y bazar de las especias se encuentran cerrados."
  },
  {
    date: new Date(2026, 3, 1), // April 1
    description: "Feriado religioso, se realizan visitas pero el gran bazar y bazar de las especias se encuentran cerrados."
  },
  {
    date: new Date(2026, 3, 23), // April 23
    description: "Feriado nacional, puede haber cambios en el orden de las visitas. Los bazares están cerrados."
  },
  {
    date: new Date(2026, 4, 1), // May 1
    description: "Feriado nacional. Los bazares están cerrados."
  },
  {
    date: new Date(2026, 4, 6), // May 6
    description: "Feriado nacional, solo puede haber cambios en el orden de las visitas. Los bazares están cerrados."
  },
  {
    date: new Date(2026, 5, 6), // June 6
    description: "1º día del feriado religioso, no se harán visitas (bazares y algunos museos cerrados)."
  },
  {
    date: new Date(2026, 6, 15), // July 15
    description: "Feriado nacional, puede haber cambios en el orden de las visitas. Los bazares están cerrados."
  },
  {
    date: new Date(2026, 7, 30), // August 30
    description: "Feriado nacional, solo puede haber cambios en el orden de las visitas. Los bazares están cerrados."
  }
];

// Check if a date is a Turkey holiday
export function isTurkeyHoliday(date: Date): boolean {
  return turkeyHolidays2026.some(holiday => {
    return (
      holiday.date.getFullYear() === date.getFullYear() &&
      holiday.date.getMonth() === date.getMonth() &&
      holiday.date.getDate() === date.getDate()
    );
  });
}

// Get holiday description for a specific date
export function getTurkeyHolidayDescription(date: Date): string | null {
  const holiday = turkeyHolidays2026.find(h => {
    return (
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate()
    );
  });
  
  return holiday ? holiday.description : null;
}
