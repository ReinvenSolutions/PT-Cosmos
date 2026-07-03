import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plane, Calculator, Users, Coins, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@shared/roles";
import {
  applyMilesMarkup,
  calculateMilesSegmentCop,
  canUseLifeMiles,
  canUseMilesCalculator,
  canUseSmiles,
  resolveMilesProgramMarkup,
  normalizeMilesProgramsAllowed,
  DEFAULT_USD_PER_1000_LIFEMILES,
  DEFAULT_USD_PER_1000_SMILES,
  DEFAULT_BRL_PER_USD,
  type MilesProgram,
} from "@shared/milesCalculator";

function roundToTens(value: number): number {
  return Math.round(value / 10) * 10;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundToTens(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function parseNumber(value: string): number {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
}

export default function ToolsMilesCalculator() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const programsAllowed = isSuperAdmin
    ? "both"
    : normalizeMilesProgramsAllowed(user?.milesProgramsAllowed);
  const hasMilesAccess = isSuperAdmin || canUseMilesCalculator(programsAllowed);
  const showLifeMiles = canUseLifeMiles(programsAllowed);
  const showSmiles = canUseSmiles(programsAllowed);

  const defaultProgram: MilesProgram = showLifeMiles ? "LIFE MILES" : "SMILES";
  const [milesProgram, setMilesProgram] = useState<MilesProgram>(defaultProgram);

  useEffect(() => {
    if (milesProgram === "LIFE MILES" && !showLifeMiles) {
      setMilesProgram("SMILES");
    } else if (milesProgram === "SMILES" && !showSmiles) {
      setMilesProgram("LIFE MILES");
    }
  }, [milesProgram, showLifeMiles, showSmiles]);

  const [miles, setMiles] = useState(0);
  const [milesDisplay, setMilesDisplay] = useState("");
  const [tax, setTax] = useState(0);
  const [taxDisplay, setTaxDisplay] = useState("");
  const [tripType, setTripType] = useState("solo-ida");
  const [passengers, setPassengers] = useState(1);

  const [milesReturn, setMilesReturn] = useState(0);
  const [milesReturnDisplay, setMilesReturnDisplay] = useState("");
  const [taxReturn, setTaxReturn] = useState(0);
  const [taxReturnDisplay, setTaxReturnDisplay] = useState("");

  const { data: trmData } = useQuery<{
    baseTrm: number | null;
    effectiveTrm: number | null;
    surchargeCop: number;
    usdPer1000LifeMiles: number;
    usdPer1000Smiles: number;
    brlPerUsd: number;
  }>({
    queryKey: ["/api/settings/global-trm"],
  });

  const effectiveTrm = trmData?.effectiveTrm ?? 0;
  const usdPer1000MilesLifeMiles = trmData?.usdPer1000LifeMiles ?? DEFAULT_USD_PER_1000_LIFEMILES;
  const usdPer1000MilesSmiles = trmData?.usdPer1000Smiles ?? DEFAULT_USD_PER_1000_SMILES;
  const brlPerUsd = trmData?.brlPerUsd ?? DEFAULT_BRL_PER_USD;

  const { type: markupType, value: markupValue } = isSuperAdmin
    ? { type: "none" as const, value: 0 }
    : resolveMilesProgramMarkup(milesProgram, user ?? {});

  const calcSegment = (segmentMiles: number, segmentTax: number) => {
    const { milesInCop, taxInCop, subtotalPerPax } = calculateMilesSegmentCop({
      program: milesProgram,
      miles: segmentMiles,
      taxAmount: segmentTax,
      usdPer1000LifeMiles: usdPer1000MilesLifeMiles,
      usdPer1000Smiles: usdPer1000MilesSmiles,
      effectiveTrm,
      brlPerUsd: milesProgram === "SMILES" ? brlPerUsd : undefined,
    });
    return { milesInCop, taxInCop, baseTotal: subtotalPerPax * passengers };
  };

  const outbound = calcSegment(miles, tax);
  const inbound = calcSegment(milesReturn, taxReturn);

  const rawBaseTotal =
    tripType === "ida-y-vuelta" ? outbound.baseTotal + inbound.baseTotal : outbound.baseTotal;

  const { finalTotal } = useMemo(
    () => applyMilesMarkup(rawBaseTotal, markupType, markupValue),
    [rawBaseTotal, markupType, markupValue],
  );

  const segmentTotalWithMarkup = (segmentBase: number) => {
    if (rawBaseTotal <= 0) return 0;
    if (markupType === "none" || markupValue <= 0) return segmentBase;
    return (segmentBase / rawBaseTotal) * finalTotal;
  };

  const outboundDisplayTotal = segmentTotalWithMarkup(outbound.baseTotal);
  const inboundDisplayTotal = segmentTotalWithMarkup(inbound.baseTotal);

  const handleMilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    setMiles(numericValue);
    setMilesDisplay(formatNumber(numericValue));
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    setTax(numericValue);
    setTaxDisplay(formatNumber(numericValue));
  };

  const handleMilesReturnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    setMilesReturn(numericValue);
    setMilesReturnDisplay(formatNumber(numericValue));
  };

  const handleTaxReturnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    setTaxReturn(numericValue);
    setTaxReturnDisplay(formatNumber(numericValue));
  };

  if (!hasMilesAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-primary/5 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Coins className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Cotizador de millas no disponible</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta no tiene acceso a esta herramienta. Contacta al administrador si necesitas habilitarla.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-primary/5">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Calculadora de Millas Cosmos
          </h1>
          <p className="text-base text-muted-foreground">
            {milesProgram === "LIFE MILES" ? "Canal Millas / Avianca" : "GOL - SMILES"}
          </p>
        </header>

        <Card className="mb-6 backdrop-blur-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {showLifeMiles && showSmiles ? (
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-3">
                    <div className="flex items-center">
                      <Coins className="text-primary mr-2" size={16} />
                      Programa de Millas
                    </div>
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMilesProgram("LIFE MILES")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        milesProgram === "LIFE MILES"
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="toggle-lifemiles"
                    >
                      LIFE MILES
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilesProgram("SMILES")}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        milesProgram === "SMILES"
                          ? "bg-orange-600 text-white shadow-md"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="toggle-smiles"
                    >
                      SMILES
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-3">
                    <div className="flex items-center">
                      <Coins className="text-primary mr-2" size={16} />
                      Programa de Millas
                    </div>
                  </Label>
                  <p className="text-lg font-bold text-foreground">
                    {milesProgram === "LIFE MILES" ? "LIFE MILES" : "SMILES"}
                  </p>
                </div>
              )}

              <div>
                <Label className="block text-sm font-medium text-foreground mb-3">
                  <div className="flex items-center">
                    <Receipt className="text-primary mr-2" size={16} />
                    Modalidad
                  </div>
                </Label>
                <RadioGroup
                  value={tripType}
                  onValueChange={setTripType}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="solo-ida" id="solo-ida" data-testid="radio-solo-ida" />
                    <Label htmlFor="solo-ida" className="text-foreground">Solo ida</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ida-y-vuelta" id="ida-y-vuelta" data-testid="radio-ida-vuelta" />
                    <Label htmlFor="ida-y-vuelta" className="text-foreground">Ida y vuelta</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="block text-sm font-medium text-foreground mb-3">
                  <div className="flex items-center">
                    <Users className="text-primary mr-2" size={16} />
                    Pasajeros
                  </div>
                </Label>
                <Select value={passengers.toString()} onValueChange={(v) => setPassengers(parseInt(v, 10))}>
                  <SelectTrigger data-testid="select-passengers">
                    <SelectValue placeholder="Número de pasajeros" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Pasajero{n > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <FlightSegmentCard
          title="Vuelo de Ida"
          milesDisplay={milesDisplay}
          taxDisplay={taxDisplay}
          onMilesChange={handleMilesChange}
          onTaxChange={handleTaxChange}
          milesInCop={outbound.milesInCop}
          taxInCop={outbound.taxInCop}
          displayTotal={outboundDisplayTotal}
          passengers={passengers}
          milesProgram={milesProgram}
          milesTestId="input-miles"
          taxTestId="input-tax"
          milesValueTestId="text-miles-value"
          totalTestId="text-total-flight"
        />

        {tripType === "ida-y-vuelta" && (
          <FlightSegmentCard
            title="Vuelo de Regreso"
            milesDisplay={milesReturnDisplay}
            taxDisplay={taxReturnDisplay}
            onMilesChange={handleMilesReturnChange}
            onTaxChange={handleTaxReturnChange}
            milesInCop={inbound.milesInCop}
            taxInCop={inbound.taxInCop}
            displayTotal={inboundDisplayTotal}
            passengers={passengers}
            milesProgram={milesProgram}
            milesTestId="input-miles-return"
            taxTestId="input-tax-return"
            milesValueTestId="text-miles-value-return"
            totalTestId="text-flight-total-return"
            flipPlane
          />
        )}

        <div className="mb-6 rounded-lg bg-primary px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-primary-foreground">
              Total{passengers > 1 ? ` (${passengers} pax)` : ""}
            </span>
            <span className="text-2xl font-bold text-primary-foreground" data-testid="text-final-total">
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-sm">
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm p-4">
            <Plane className="text-primary" size={20} />
            <span className="font-semibold text-foreground">
              {milesProgram === "LIFE MILES" ? "Avianca LifeMiles" : "GOL Smiles"}
            </span>
            <span className="text-muted-foreground">Cálculo en tiempo real</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm p-4">
            <Calculator className="text-primary" size={20} />
            <span className="font-semibold text-foreground">TRM del sistema</span>
            <span className="text-muted-foreground">
              {effectiveTrm > 0
                ? `$ ${effectiveTrm.toLocaleString("es-CO")} COP/USD`
                : "Configura la TRM en Administración"}
            </span>
            {milesProgram === "SMILES" && (
              <span className="text-muted-foreground text-xs">
                BRL/USD: {brlPerUsd.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FlightSegmentCard({
  title,
  milesDisplay,
  taxDisplay,
  onMilesChange,
  onTaxChange,
  milesInCop,
  taxInCop,
  displayTotal,
  passengers,
  milesProgram,
  milesTestId,
  taxTestId,
  milesValueTestId,
  totalTestId,
  flipPlane,
}: {
  title: string;
  milesDisplay: string;
  taxDisplay: string;
  onMilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTaxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  milesInCop: number;
  taxInCop: number;
  displayTotal: number;
  passengers: number;
  milesProgram: MilesProgram;
  milesTestId: string;
  taxTestId: string;
  milesValueTestId: string;
  totalTestId: string;
  flipPlane?: boolean;
}) {
  const isSmiles = milesProgram === "SMILES";

  return (
    <Card className="mb-6 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Plane
            className="text-primary"
            size={22}
            style={flipPlane ? { transform: "scaleX(-1)" } : undefined}
          />
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor={milesTestId} className="block text-sm font-medium text-foreground mb-2">
                <div className="flex items-center">
                  <Coins className="text-primary mr-2" size={16} />
                  Cantidad de Millas
                </div>
              </Label>
              <Input
                type="text"
                id={milesTestId}
                data-testid={milesTestId}
                placeholder={milesProgram === "SMILES" ? "Ej: 156,400 millas" : "Ej: 28,000 millas"}
                value={milesDisplay}
                onChange={onMilesChange}
              />
            </div>

            <div>
              <Label htmlFor={taxTestId} className="block text-sm font-medium text-foreground mb-2">
                <div className="flex items-center">
                  <Receipt className="text-primary mr-2" size={16} />
                  Impuesto ({isSmiles ? "BRL" : "COP"})
                </div>
              </Label>
              <Input
                type="text"
                id={taxTestId}
                data-testid={taxTestId}
                placeholder={
                  isSmiles
                    ? "Ingrese el impuesto en reales (ej: 546)"
                    : "Ingrese el impuesto (ej: 150,000)"
                }
                value={taxDisplay}
                onChange={onTaxChange}
              />
            </div>
          </div>

          <div className="space-y-3">
            <ResultRow label="Valor en Millas" value={formatCurrency(milesInCop)} testId={milesValueTestId} />
            <ResultRow
              label={isSmiles ? "Impuesto (convertido)" : "Impuesto"}
              value={formatCurrency(taxInCop)}
            />
            <div className="rounded-lg bg-primary px-4 py-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-primary-foreground">
                  Total{passengers > 1 ? ` (${passengers} pax)` : ""}
                </span>
                <Plane className="text-primary-foreground/80" size={16} />
              </div>
              <span data-testid={totalTestId} className="text-xl font-bold text-primary-foreground">
                {formatCurrency(displayTotal)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultRow({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex justify-between items-center rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span data-testid={testId} className="text-base font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}
