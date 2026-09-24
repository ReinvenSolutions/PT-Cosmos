import { useState } from "react";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar, type PriceTier } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { dateToYmd, eachDateYmd, type AvailabilityDay } from "@shared/availability";

function slotSwatchClass(slots: number): string {
  if (slots <= 0) return "bg-gray-400";
  if (slots <= 3) return "bg-red-600";
  if (slots <= 7) return "bg-orange-500";
  if (slots <= 15) return "bg-yellow-400";
  return "bg-emerald-600";
}

export function AvailabilityLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
        16 o más cupos
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        8–15 cupos
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
        4–7 cupos
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
        1–3 cupos
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />
        Sin cupos
      </li>
    </ul>
  );
}

function parseSlots(raw: string): number | null {
  const slotNum = Number(raw);
  if (!Number.isInteger(slotNum) || slotNum < 0) return null;
  return slotNum;
}

function parsePrice(raw: string): string | null | undefined {
  if (raw.trim() === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return amount.toFixed(2);
}

export function AvailabilityEditor({
  days,
  onChange,
}: {
  days: AvailabilityDay[];
  onChange: (days: AvailabilityDay[]) => void;
}) {
  const [pickMode, setPickMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState<Date | undefined>();
  const [range, setRange] = useState<DateRange | undefined>();
  const [slots, setSlots] = useState("16");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  const selectedDates = (): string[] => {
    if (pickMode === "single") {
      return singleDate ? [dateToYmd(singleDate)] : [];
    }
    if (!range?.from) return [];
    return eachDateYmd(dateToYmd(range.from), dateToYmd(range.to ?? range.from));
  };

  const fillFromDates = (dates: string[]) => {
    if (dates.length === 0) return;
    const matched = dates
      .map((date) => days.find((day) => day.date === date))
      .filter((day): day is AvailabilityDay => !!day);
    if (matched.length !== dates.length) return;
    const first = matched[0];
    const same = matched.every((day) => day.slots === first.slots && day.price === first.price);
    if (!same) return;
    setSlots(String(first.slots));
    setPrice(first.price ?? "");
  };

  const apply = () => {
    const dates = selectedDates();
    if (dates.length === 0) {
      setError(
        pickMode === "single"
          ? "Selecciona una fecha en el calendario."
          : "Selecciona un día o un rango en el calendario.",
      );
      return;
    }
    const slotNum = parseSlots(slots);
    if (slotNum == null) {
      setError("Los cupos deben ser un número entero mayor o igual a 0.");
      return;
    }
    const nextPrice = parsePrice(price);
    if (nextPrice === undefined) {
      setError("El precio debe ser un número mayor o igual a 0, o quedar vacío.");
      return;
    }
    setError("");
    const next = new Map(days.map((day) => [day.date, day]));
    for (const date of dates) {
      next.set(date, { date, slots: slotNum, price: nextPrice });
    }
    onChange(Array.from(next.values()).sort((a, b) => a.date.localeCompare(b.date)));
  };

  const clearSelection = () => {
    const dates = new Set(selectedDates());
    if (dates.size === 0) return;
    onChange(days.filter((day) => !dates.has(day.date)));
    setSingleDate(undefined);
    setRange(undefined);
  };

  const updateDay = (date: string, patch: Partial<Pick<AvailabilityDay, "slots" | "price">>) => {
    onChange(
      days.map((day) => (day.date === date ? { ...day, ...patch } : day)),
    );
  };

  return (
    <div className="space-y-4">
      <AvailabilityLegend />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={pickMode === "single" ? "default" : "outline"}
          onClick={() => {
            setPickMode("single");
            setRange(undefined);
            setError("");
          }}
        >
          Una fecha
        </Button>
        <Button
          type="button"
          variant={pickMode === "range" ? "default" : "outline"}
          onClick={() => {
            setPickMode("range");
            setSingleDate(undefined);
            setError("");
          }}
        >
          Rango de fechas
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {pickMode === "single"
          ? "Elige un día. Si ya tiene cupos, puedes cambiar la cantidad y actualizar."
          : "Elige el primer y el último día. Actualizar aplica los mismos cupos a todo el rango, incluso si esas fechas ya existían."}
      </p>
      {pickMode === "single" ? (
        <Calendar
          mode="single"
          locale={es}
          numberOfMonths={2}
          selected={singleDate}
          onSelect={(date) => {
            setSingleDate(date);
            if (date) fillFromDates([dateToYmd(date)]);
          }}
          availability={days}
        />
      ) : (
        <Calendar
          mode="range"
          locale={es}
          numberOfMonths={2}
          selected={range}
          onSelect={(next) => {
            setRange(next);
            if (!next?.from) return;
            fillFromDates(eachDateYmd(dateToYmd(next.from), dateToYmd(next.to ?? next.from)));
          }}
          availability={days}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-[8rem_10rem_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="availability-slots">Cupos</Label>
          <Input
            id="availability-slots"
            type="number"
            min={0}
            step={1}
            value={slots}
            onChange={(event) => setSlots(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="availability-price">Precio USD (opcional)</Label>
          <Input
            id="availability-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            placeholder="Sin precio"
            onChange={(event) => setPrice(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={apply}>
            Actualizar cupos
          </Button>
          <Button type="button" variant="outline" onClick={clearSelection}>
            Quitar selección
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {days.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{days.length} fecha(s) con cupos. Puedes cambiar cada una aquí.</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
            {days.map((day) => (
              <li key={day.date} className="grid grid-cols-[auto_6.5rem_5.5rem_1fr_auto] items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", slotSwatchClass(day.slots))} />
                <span className="text-sm tabular-nums">{day.date}</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  aria-label={`Cupos del ${day.date}`}
                  value={day.slots}
                  onChange={(event) => {
                    const slotNum = parseSlots(event.target.value);
                    if (slotNum == null) return;
                    updateDay(day.date, { slots: slotNum });
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  aria-label={`Precio del ${day.date}`}
                  value={day.price ?? ""}
                  placeholder="Sin precio"
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw.trim() === "") {
                      updateDay(day.date, { price: null });
                      return;
                    }
                    if (!/^\d+(\.\d{0,2})?$/.test(raw)) return;
                    updateDay(day.date, { price: raw });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(days.filter((item) => item.date !== day.date))}
                >
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay fechas con cupos.</p>
      )}
    </div>
  );
}

export function AvailabilityMonthView({
  days,
  priceTiers,
}: {
  days: AvailabilityDay[];
  priceTiers?: PriceTier[];
}) {
  return (
    <div className="space-y-3">
      <AvailabilityLegend />
      <Calendar
        locale={es}
        numberOfMonths={2}
        availability={days}
        priceTiers={priceTiers}
      />
    </div>
  );
}
