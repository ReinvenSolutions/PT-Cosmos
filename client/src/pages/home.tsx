import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { type Destination } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Clock, ArrowRight, AlertCircle, Info, Building2, UtensilsCrossed, Star, Stethoscope, Landmark, ExternalLink, BookOpen } from "lucide-react";
import { getDestinationImage } from "@/lib/destination-images";
import { DatePicker } from "@/components/ui/date-picker";
import { isTuesday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { isTurkeyHoliday, getTurkeyHolidayDescription } from "@/lib/turkey-holidays";
import { GroupDiscountBanner } from "@/components/group-discount-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/optimized-image";
import {
  loadHomeBuilderSelection,
  saveHomeBuilderSelection,
  formatLocalYmd,
  parseLocalYmd,
} from "@/lib/home-selection-storage";

interface DestinationDetail {
  destination: Destination;
  hotels: any[];
  itinerary: any[];
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("internacional");
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectionHydrated, setSelectionHydrated] = useState(false);
  const { toast } = useToast();

  type DestinationWithPreviews = Destination & { hotels: any[]; itinerary: any[] };
  const {
    data: destinationsWithPreviews = [],
    isLoading: destinationsLoading,
    isError: destinationsQueryError,
    error: destinationsQueryErr,
  } = useQuery<DestinationWithPreviews[]>({
    queryKey: ["/api/destinations-previews?isActive=true"],
  });

  useEffect(() => {
    const saved = loadHomeBuilderSelection();
    if (saved) {
      if (saved.destinations.length > 0) {
        setSelectedDestinations(saved.destinations);
      }
      const d = saved.startDate ? parseLocalYmd(saved.startDate) : undefined;
      if (d) setStartDate(d);
    }
    setSelectionHydrated(true);
  }, []);

  useEffect(() => {
    if (!selectionHydrated) return;
    saveHomeBuilderSelection({
      destinations: selectedDestinations,
      startDate: startDate ? formatLocalYmd(startDate) : "",
    });
  }, [selectedDestinations, startDate, selectionHydrated]);

  useEffect(() => {
    if (!selectionHydrated || destinationsWithPreviews.length === 0) return;
    const validIds = new Set(destinationsWithPreviews.map((d) => d.id));
    setSelectedDestinations((prev) => prev.filter((id) => validIds.has(id)));
  }, [destinationsWithPreviews, selectionHydrated]);

  const destinations = destinationsWithPreviews;
  const destinationDetails: Record<string, DestinationDetail> = Object.fromEntries(
    destinationsWithPreviews.map((d) => [
      d.id,
      { destination: d, hotels: d.hotels ?? [], itinerary: d.itinerary ?? [] },
    ])
  );

  const selectedDests = selectedDestinations
    .map((id) => destinations.find((d) => d.id === id))
    .filter((d): d is DestinationWithPreviews => !!d);

  const hasTurkeyDestinations = selectedDests.some(
    (d) =>
      d.country?.toLowerCase().includes("turquía") ||
      d.country?.toLowerCase().includes("turquia")
  );
  const hasTurkeyEsencial = selectedDests.some((d) => d.name === "Turquía Esencial");
  const hasGranTourEuropa = selectedDests.some((d) => d.name === "Gran Tour de Europa");
  const hasAllowedDaysRestriction = selectedDests.some((d) => d.allowedDays && d.allowedDays.length > 0);
  const allowedDaysDestination = selectedDests.find((d) => d.allowedDays && d.allowedDays.length > 0);

  const turkeyDestinations = selectedDests.filter(
    (d) =>
      d.country?.toLowerCase().includes("turquía") ||
      d.country?.toLowerCase().includes("turquia")
  );
  const otherDestinations = selectedDests.filter(
    (d) =>
      !d.country?.toLowerCase().includes("turquía") &&
      !d.country?.toLowerCase().includes("turquia")
  );

  const calculateTotalDuration = (): number => {
    if (!startDate || selectedDestinations.length === 0) return 0;

    let total = selectedDestinations.reduce((sum, destId) => {
      const dest = destinations.find((d) => d.id === destId);
      return sum + (dest?.duration || 0);
    }, 0);

    // +1 día si algún plan tiene requiresExtraDay activo (configurable en admin)
    const hasExtraDay = selectedDestinations.some((destId) => {
      const dest = destinations.find((d) => d.id === destId);
      return (dest as { requiresExtraDay?: boolean })?.requiresExtraDay === true;
    });
    if (hasExtraDay) total += 1;

    return total;
  };

  const calculateEndDate = (): string => {
    const totalDuration = calculateTotalDuration();

    if (totalDuration === 0 || !startDate) return "";

    const end = new Date(startDate);
    end.setDate(end.getDate() + totalDuration - 1);

    return end.toISOString().split("T")[0];
  };

  const endDate = calculateEndDate();

  /** Un bloqueo tiene salida fija: al seleccionarlo sola, fijar la fecha del calendario automáticamente. */
  useEffect(() => {
    if (selectedDestinations.length !== 1) return;
    const one = destinations.find((d) => d.id === selectedDestinations[0]);
    if (one?.isBloqueo && one.bloqueoSalidaFecha) {
      const [y, m, d] = one.bloqueoSalidaFecha.split("-").map(Number);
      setStartDate(new Date(y, m - 1, d));
    }
  }, [selectedDestinations, destinations]);

  const isAllowedDay = (date: Date, allowedDays: string[]): boolean => {
    const dayOfWeek = date.getDay();
    const dayNames: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    return allowedDays.includes(dayNames[dayOfWeek]);
  };

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const firstSelectedDest = selectedDests[0];
  const bloqueoSalidaFija =
    selectedDests.length === 1 && firstSelectedDest?.isBloqueo && firstSelectedDest.bloqueoSalidaFecha
      ? firstSelectedDest.bloqueoSalidaFecha
      : null;

  const disableDates = (date: Date) => {
    // Disable past dates
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true;
    }

    if (bloqueoSalidaFija) {
      return getDateString(date) !== bloqueoSalidaFija;
    }

    // For Turkey Esencial, check if date has exact priceTier match (Monday or Tuesday only)
    if (hasTurkeyEsencial) {
      if (isTurkeyHoliday(date)) {
        return true;
      }

      const destinationWithTiers = selectedDests.find(d => d.name === "Turquía Esencial");
      if (destinationWithTiers?.priceTiers) {
        const dateStr = getDateString(date);
        // Only allow dates that have an exact match in priceTiers (Monday with COL or Tuesday with price)
        const hasExactDate = destinationWithTiers.priceTiers.some(tier => tier.endDate === dateStr);
        return !hasExactDate;
      }

      // Fallback: allow Monday (1) for flight and Tuesday (2) for arrival
      const dayOfWeek = date.getDay();
      return !(dayOfWeek === 1 || dayOfWeek === 2);
    }

    // For Europe plans with priceTiers and flight days, check exact date matches
    const europePlan = selectedDests.find(d =>
      (d.name.includes("Italia Turística") ||
        d.name.includes("España e Italia") ||
        d.name.includes("Gran Tour de Europa")) &&
      d.priceTiers && d.priceTiers.length > 0
    );

    if (europePlan) {
      const dateStr = getDateString(date);
      // Only allow dates that have an exact match in priceTiers (flight day or arrival day)
      const hasExactDate = (europePlan.priceTiers ?? []).some((tier) => tier.endDate === dateStr);
      return !hasExactDate; // Return immediately - don't check other conditions
    }

    // For destinations with priceTiers (date ranges like Dubai), check if date is within valid range
    // Exclude Europe plans and Turkey Esencial
    const destinationWithTiers = selectedDests.find(d =>
      d.priceTiers && d.priceTiers.length > 0 &&
      d.name !== "Turquía Esencial" &&
      !d.name.includes("Italia Turística") &&
      !d.name.includes("España e Italia") &&
      !d.name.includes("Gran Tour de Europa")
    );

    if (destinationWithTiers) {
      const dateStr = getDateString(date);
      const isWithinRange = destinationWithTiers.priceTiers!.some(tier => {
        const startDate = tier.startDate || '2000-01-01'; // If no startDate, use a past date
        return dateStr >= startDate && dateStr <= tier.endDate;
      });

      if (!isWithinRange) {
        return true; // Disable dates outside all price tier ranges
      }
    }

    // For destinations with specific allowed days (e.g., Egypt: Monday and Friday only)
    // Don't apply to Europe plans as they handle their own date logic
    if (hasAllowedDaysRestriction && allowedDaysDestination?.allowedDays &&
      !europePlan) {
      // Check if it's an allowed day of the week
      if (!isAllowedDay(date, allowedDaysDestination.allowedDays)) {
        return true;
      }

      return false;
    }

    // For other Turkey destinations, only disable non-Tuesday dates
    if (hasTurkeyDestinations) {
      return !isTuesday(date);
    }

    return false;
  };

  // Validate selected date against Turkey holidays
  useEffect(() => {
    if (hasTurkeyEsencial && startDate && isTurkeyHoliday(startDate)) {
      const description = getTurkeyHolidayDescription(startDate);
      toast({
        title: "Fecha no disponible",
        description: `No se puede seleccionar esta fecha porque es festivo en Turquía: ${description}`,
        variant: "destructive",
      });
      setStartDate(undefined);
    }
  }, [startDate, hasTurkeyEsencial, toast]);

  /** Parsea la categoría del hotel para obtener las estrellas. Soporta: "5*", "4 estrellas", "3*", etc. */
  const parseHotelCategoryToStars = (category: string | null | undefined): number | null => {
    if (!category?.trim()) return null;
    const s = category.trim().toLowerCase();
    // Formato "5*", "4*", "3*"
    const asteriskMatch = s.match(/^(\d)\s*\*?$/);
    if (asteriskMatch) return Math.min(5, Math.max(1, parseInt(asteriskMatch[1])));
    // Formato "5 estrellas", "4 estrellas", "3 stars"
    const wordMatch = s.match(/(\d)\s*(?:estrellas?|stars?)/);
    if (wordMatch) return Math.min(5, Math.max(1, parseInt(wordMatch[1])));
    // Formato "X*" dentro del texto
    const inlineMatch = s.match(/(\d)\s*\*/);
    if (inlineMatch) return Math.min(5, Math.max(1, parseInt(inlineMatch[1])));
    return null;
  };

  const getHotelStars = (destId: string): number => {
    const details = destinationDetails[destId];
    if (!details?.hotels?.length) return 4;

    const starCounts = details.hotels
      .map((hotel) => parseHotelCategoryToStars(hotel.category))
      .filter((n): n is number => n !== null);
    if (starCounts.length === 0) return 4;

    return Math.max(...starCounts, 1);
  };

  const formatAllowedDays = (days: string[]): string => {
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayMapSpanish: Record<string, string> = {
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };

    // Sort days by their order in the week
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    // Check for consecutive days to create ranges
    if (sortedDays.length >= 5) {
      const firstDay = dayMapSpanish[sortedDays[0]];
      const lastDay = dayMapSpanish[sortedDays[sortedDays.length - 1]];
      return `${firstDay} a ${lastDay}`;
    }

    // For few days, list them
    return sortedDays.map(d => dayMapSpanish[d]).join(' y ');
  };

  const getMealsInfo = (destId: string): { breakfasts: number; lunches: number; dinners: number; total: number } => {
    const dest = destinations.find(d => d.id === destId);

    const details = destinationDetails[destId];
    if (!details || !details.itinerary || details.itinerary.length === 0) {
      const nights = dest?.nights || 0;
      return { breakfasts: nights, lunches: 0, dinners: 0, total: nights };
    }

    let breakfasts = 0;
    let lunches = 0;
    let dinners = 0;

    details.itinerary.forEach((day: any) => {
      if (day.meals && Array.isArray(day.meals)) {
        day.meals.forEach((meal: string) => {
          const lowerMeal = meal.toLowerCase();
          if (lowerMeal.includes('desayuno') || lowerMeal.includes('breakfast')) breakfasts++;
          // No usar "comida" suelto: coincide con "sin comidas", "bebidas en comidas", etc.
          if (lowerMeal.includes('almuerzo') || lowerMeal.includes('lunch')) lunches++;
          if (lowerMeal.includes('cena') || lowerMeal.includes('dinner')) dinners++;
        });
      }
    });

    if (breakfasts === 0 && dest?.nights) {
      breakfasts = dest.nights;
    }

    return { breakfasts, lunches, dinners, total: breakfasts + lunches + dinners };
  };

  /** Prioridad: el texto de tooltip configurado en la edición o creación de planes (admin) es el oficial. Solo si está vacío se usa el fallback por defecto. */
  const getTooltipForCard = (dest: Destination): string => {
    const custom = (dest as { cardTooltip?: string | null }).cardTooltip?.trim();
    if (custom) return custom;
    return getTooltipContentFallback(dest);
  };

  const getTooltipContentFallback = (dest: Destination): string => {
    // Tooltip específico para Lo Mejor de Cusco + Lima
    if (dest.name === "Lo Mejor de Cusco + Lima") {
      return "Salidas diarias, programa incluye todas las actividades de interes para los dias de viaje. Cualquier cambio, bajo solicitud. Incluye impuestos. Acompañamiento de guia, solo en actividades. Requiere vuelos internos para el 4to dia; se recomienda sea antes de las 07:00am, tienen incluida actividad el primer dia de llegada a CUZ.";
    }

    // Tooltip específico para todos los programas de Perú
    if (dest.country === "Perú" ||
      dest.name.includes("Cusco") ||
      dest.name.includes("Perú") ||
      dest.name.includes("Lima") ||
      dest.name.includes("Machu Picchu") ||
      dest.name.includes("Paracas") ||
      dest.name.includes("Nazca") ||
      dest.name.includes("Huacachina")) {
      return "Salidas diarias, programa incluye todas las actividades de interes para los dias de viaje. Cualquier cambio, bajo solicitud. Incluye impuestos. Acompañamiento de guia, solo en actividades. No requiere vuelos internos";
    }

    // Tooltip específico para Dubai Maravilloso
    if (dest.name === "DUBAI Maravilloso") {
      return "Salidas diarias desde 2 pax. Combinalo facil. Tarifa dinamica. Plan no requiere mejoras. Impuestos no incluidos. Acompañamiento de guia durante todo el recorrido";
    }

    // Tooltip específico para Auroras Boreales Finlandia
    if (dest.name === "Auroras boreales finlandia") {
      return "Salidas diarias desde 2 pax. Programa se sugiere combinar con Madrid o Paris al inicio y/o final del viaje. Impuestos incluidos. Acompañamiento de guia, solo en las actividades. Permite mejoras o cambios, bajo solicitud. Temporada de auroras de diciembre a marzo";
    }

    // Tooltip específico para Egipto con Crucero + Emiratos
    if (dest.name === "Egipto (Con Crucero) + Emiratos Árabes") {
      return "Fechas puntuales (revisar disponibilidad). Programa combinado con vuelos internos incluidos en EGIPTO (El Cairo- Aswan/ Luxor- El Cairo en clase turista). Guia acompañante durante recorrido en El Cairo - Dubai. Programa no requeire mejoras";
    }

    // Tooltip específico para Gran Tour de Europa
    if (dest.name === "Gran Tour de Europa") {
      return "Salidas dias lunes (revisar disponibilidad). Programa circuito con acompañamiento de guia durante todo el recorrido. Inicia en MAD - termina en MAD. Programa permite incluir mejoras (actividades opcionales no incluidas)";
    }

    // Tooltip específico para Italia Turística - Euro Express
    if (dest.name === "Italia Turística - Euro Express") {
      return "Salidas dias viernes (validar disponibilidad) Programa circuito con acompañamiento de guia de habla hispana, durante todo el recorrido. Programa inicia en Roma y termina en Milán. Programa APLICA para mejoras";
    }

    // Tooltip específico para España e Italia Turística - Euro Express
    if (dest.name === "España e Italia Turística - Euro Express") {
      return "Salidas dias lunes (validar disponibilidad) Programa circuito con acompañamiento de guia de habla hispana durante todo el recorrido. Programa inicia en Madrid y termina en Milan.  Programa NO requiere mejoras.";
    }

    // Tooltip específico para Turquía Esencial
    if (dest.name === "Turquía Esencial") {
      return "Salidas todos los miércoles del año. Sabados entre marzo a nov 2026. Si vendes con vuelo, debes cotizar salida los martes y viernes desde Colombia. Programa terrestre con acompañamiento de guía habla hispana en destino. No incluye impuestos.";
    }

    if (
      dest.country?.toLowerCase().includes("turquía") ||
      dest.country?.toLowerCase().includes("turquia")
    ) {
      const otherCountries = Array.from(new Set(
        destinations
          .filter(d => d.category === "internacional" && d.country !== dest.country && d.country !== "Colombia")
          .map(d => d.country)
      )).join(", ");

      return `Salidas todos los Martes desde Colombia. Combinable con: ${otherCountries || "otros destinos"} (salidas diarias). Turquía siempre va primero en la ruta.`;
    }

    return `Salidas diarias. Combinable con todos los destinos. Si combinas con Turquía, ten en cuenta que Turquía tiene salidas los Martes desde Colombia y será el primer destino en tu ruta.`;
  };

  const filteredDestinations = destinations.filter((dest) => {
    const matchesCategory =
      selectedCategory === "bloqueos"
        ? !!dest.isBloqueo &&
          !!dest.bloqueoSalidaFecha &&
          dest.bloqueoCuposDisponibles != null
        : dest.category === selectedCategory;

    const matchesSearch = searchQuery === "" ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const isBloqueoAgotado = (dest: Destination) =>
    !!dest.isBloqueo && dest.bloqueoCuposDisponibles != null && dest.bloqueoCuposDisponibles <= 0;

  const toggleDestination = (destId: string) => {
    const dest = destinations.find((d) => d.id === destId);

    if (selectedDestinations.includes(destId)) {
      // Deseleccionar el destino actual
      setSelectedDestinations(selectedDestinations.filter((id) => id !== destId));
    } else {
      if (dest && isBloqueoAgotado(dest)) {
        toast({
          title: "Cupos agotados",
          description: "Este bloqueo ya no tiene cupos disponibles.",
          variant: "destructive",
        });
        return;
      }

      if (dest?.isBloqueo) {
        const otros = selectedDestinations.filter((id) => {
          const x = destinations.find((d) => d.id === id);
          return x && !x.isBloqueo;
        });
        if (otros.length > 0) {
          toast({
            title: "Solo bloqueo",
            description: "Un bloqueo no se puede combinar con otros planes. Quita los demás destinos primero.",
            variant: "destructive",
          });
          return;
        }
        setSelectedDestinations([destId]);
        if (dest.bloqueoSalidaFecha) {
          const [y, mo, d] = dest.bloqueoSalidaFecha.split("-").map(Number);
          setStartDate(new Date(y, mo - 1, d));
        }
        return;
      }

      if (selectedDests.some((d) => d.isBloqueo)) {
        toast({
          title: "Quita el bloqueo",
          description: "Para cotizar otros destinos, deselecciona primero el plan bloqueo.",
          variant: "destructive",
        });
        return;
      }

      if (dest?.allowedDays && dest.allowedDays.length > 0 && startDate && !isAllowedDay(startDate, dest.allowedDays)) {
        const dateStr = startDate.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const allowedDaysText = dest.allowedDays.map(day => {
          const dayMap: Record<string, string> = {
            'monday': 'lunes',
            'tuesday': 'martes',
            'wednesday': 'miércoles',
            'thursday': 'jueves',
            'friday': 'viernes',
            'saturday': 'sábado',
            'sunday': 'domingo'
          };
          return dayMap[day] || day;
        }).join(' y ');

        toast({
          title: `${dest.name} - Días Limitados`,
          description: `La fecha seleccionada (${dateStr}) no está disponible. Este programa solo puede iniciarse los días ${allowedDaysText}. Por favor, selecciona una fecha válida.`,
          variant: "destructive",
        });

        setStartDate(undefined);
        return;
      }

      setSelectedDestinations([...selectedDestinations, destId]);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <GroupDiscountBanner />

      <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 py-3 px-4 shadow-sm">
        <div className="container mx-auto max-w-lg">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar destinos por nombre o país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-sm"
              data-testid="input-search-destinations"
            />
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>


      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-accent/50 to-background">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <section
            className="mb-5 md:mb-7 rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card/90 to-background shadow-md ring-1 ring-primary/10 p-4 sm:p-5"
            aria-label="Enlaces a servicios externos"
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Servicios externos
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Accesos directos a asistencia médica y pagos
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <a
                href="https://www.emisiones48hd.com/user/login/?next=/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl border-2 border-emerald-500/25 bg-emerald-500/[0.08] p-4 text-left transition-all hover:border-emerald-500/45 hover:bg-emerald-500/[0.14] hover:shadow-lg hover:shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform">
                  <Stethoscope className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex items-center gap-2 font-semibold text-foreground text-base">
                    Asistencia médica
                    <ExternalLink className="h-4 w-4 shrink-0 text-emerald-600 opacity-80 group-hover:opacity-100" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground leading-snug">
                    Emisión y consulta 48 horas
                  </span>
                </span>
              </a>
              <a
                href="https://portalpagos.davivienda.com/#/comercio/11060/COSMOS%20INDUSTRIA%20DE%20VIAJES"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-xl border-2 border-sky-600/25 bg-sky-600/[0.08] p-4 text-left transition-all hover:border-sky-600/45 hover:bg-sky-600/[0.14] hover:shadow-lg hover:shadow-sky-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-inner ring-2 ring-sky-500/30 group-hover:scale-105 transition-transform">
                  <Landmark className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex items-center gap-2 font-semibold text-foreground text-base">
                    Portal de pagos
                    <ExternalLink className="h-4 w-4 shrink-0 text-sky-700 opacity-80 group-hover:opacity-100" aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground leading-snug">
                    Davivienda · Cosmos Industria de Viajes
                  </span>
                </span>
              </a>
            </div>
          </section>

          <div className="glass-card rounded-xl p-6 mb-8">
            {hasTurkeyEsencial && (
              <Alert className="mb-4 border-primary/30 bg-accent">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-accent-foreground">
                  <strong>Turquía Esencial:</strong> Puedes seleccionar <strong>martes</strong> (vuelo desde Colombia, 11 días) o <strong>miércoles</strong> (llegada directa, 10 días).
                  {otherDestinations.length > 0 && (
                    <span className="block mt-1">Los destinos de Turquía se han movido al inicio del itinerario automáticamente.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {hasGranTourEuropa && (
              <Alert className="mb-4 border-purple-200 bg-purple-50">
                <Info className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Gran Tour de Europa:</strong> Puedes seleccionar <strong>domingo</strong> (vuelo desde Colombia, 17 días) o <strong>lunes</strong> (llegada directa, 16 días).
                </AlertDescription>
              </Alert>
            )}

            {hasTurkeyDestinations && !hasTurkeyEsencial && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-price-accent" />
                <AlertDescription className="text-accent-foreground">
                  <strong>Planes de Turquía seleccionados:</strong> Solo puedes seleccionar días <strong>martes</strong> como fecha de inicio.
                  Los vuelos desde Colombia salen martes y llegan miércoles a Turquía debido al cambio horario (+1 día adicional).
                  {otherDestinations.length > 0 && (
                    <span className="block mt-1">Los destinos de Turquía se han movido al inicio del itinerario automáticamente.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de Inicio del Viaje
                  {hasTurkeyEsencial && <Badge variant="secondary" className="ml-2">Martes o Miércoles</Badge>}
                  {hasGranTourEuropa && <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">Domingo o Lunes</Badge>}
                  {hasTurkeyDestinations && !hasTurkeyEsencial && <Badge variant="secondary" className="ml-2">Solo Martes</Badge>}
                  {hasAllowedDaysRestriction && allowedDaysDestination && (
                    <Badge variant="secondary" className="ml-2">
                      {formatAllowedDays(allowedDaysDestination.allowedDays || [])}
                    </Badge>
                  )}
                </label>
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder={
                    hasAllowedDaysRestriction && allowedDaysDestination
                      ? formatAllowedDays(allowedDaysDestination.allowedDays || [])
                      : hasTurkeyEsencial
                        ? "Selecciona martes o miércoles"
                        : hasTurkeyDestinations
                          ? "Selecciona un martes"
                          : "Selecciona una fecha"
                  }
                  disabled={disableDates}
                  priceTiers={
                    selectedDestinations.length > 0
                      ? selectedDests.flatMap(dest =>
                        (dest.priceTiers || []).map(tier => ({
                          ...tier,
                          destinationName: dest.name
                        }))
                      )
                      : undefined
                  }
                />
                {selectedDestinations.length > 0 && selectedDests.some(d => d.priceTiers && d.priceTiers.length > 0) && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-emerald-800 space-y-1">
                        <p className="font-semibold">Información del Calendario:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>Las fechas con <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[0.65rem] font-medium">precio</span> están disponibles</li>
                          {hasTurkeyEsencial && (
                            <li>
                              <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[0.6rem] font-medium">🛫 COL</span> = Vuelo desde Colombia (lunes, 11 días total)
                            </li>
                          )}
                          {hasTurkeyEsencial && (
                            <li>
                              Martes = Llegada directa desde otro país (10 días)
                            </li>
                          )}
                          {selectedDestinations.length > 1 && (
                            <li>El número <span className="bg-blue-600 text-white w-4 h-4 rounded-full inline-flex items-center justify-center text-[0.5rem] font-bold">2+</span> indica múltiples destinos en esa fecha</li>
                          )}
                          <li>Pasa el mouse sobre una fecha para ver detalles de precio por destino</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de Finalización (Calculada Automáticamente)
                </label>
                <div className="w-full px-3 py-2 border rounded-md bg-muted/50 text-foreground flex items-center" data-testid="text-end-date">
                  {endDate ? (
                    <span className="font-medium">
                      {new Date(endDate + "T00:00:00").toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">Selecciona fecha de inicio y destinos</span>
                  )}
                </div>
                {endDate && selectedDestinations.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Basado en {calculateTotalDuration()} días de viaje
                    {hasTurkeyDestinations && <span className="text-price-accent"> (incluye día de vuelo a Turquía)</span>}
                  </p>
                )}
              </div>
            </div>

            {selectedDestinations.length > 0 && (
              <div className="mt-4 p-4 bg-accent rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-2">Destinos Seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDestinations.map((destId) => {
                    const dest = destinations.find((d) => d.id === destId);
                    return dest ? (
                      <Badge key={destId} variant="secondary" className="px-3 py-1">
                        {dest.name} ({dest.duration}D/{dest.nights}N)
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>


          {destinationsQueryError && (
            <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <span className="block font-medium">No se pudieron cargar los planes desde el servidor.</span>
                <span className="block text-sm opacity-95">
                  {(destinationsQueryErr as Error)?.message || "Error desconocido"}
                </span>
                <span className="block text-sm opacity-90">
                  Si aparece una columna faltante (por ejemplo <code className="rounded bg-background/80 px-1">is_bloqueo</code>,{" "}
                  <code className="rounded bg-background/80 px-1">hotel_gallery_image_urls</code>), aplica la migración correspondiente
                  (p. ej. <code className="rounded bg-background/80 px-1">0018_destinations_bloqueos.sql</code>,{" "}
                  <code className="rounded bg-background/80 px-1">0014_destination_hotel_gallery.sql</code>) en la misma base que usa{" "}
                  <code className="rounded bg-background/80 px-1">DATABASE_URL</code>, o ejecuta{" "}
                  <code className="rounded bg-background/80 px-1">npm run db:apply-pending</code> con ese <code className="rounded bg-background/80 px-1">.env</code>.
                  Revisa la consola del servidor (<code className="rounded bg-background/80 px-1">npm run dev</code>).
                </span>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full tabs-category">
            <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
              <strong className="text-foreground">Clic en la tarjeta</strong> para seleccionar o quitar un plan en tu combinación.
              Usa <strong className="text-foreground">«Ficha del plan»</strong> para abrir el itinerario completo, galerías y precios sin descargar el PDF.
            </p>
            <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
              <TabsTrigger value="nacional" data-testid="tab-nacional">
                Colombia
              </TabsTrigger>
              <TabsTrigger value="internacional" data-testid="tab-internacional">
                Planes Internacionales
              </TabsTrigger>
              <TabsTrigger value="bloqueos" data-testid="tab-bloqueos">
                Bloqueos
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {destinationsLoading ? (
                  Array.from({ length: 9 }, (_, i) => (
                    <Card key={`dest-skeleton-${i}`} variant="glass" className="overflow-hidden">
                      <Skeleton className="aspect-video w-full rounded-none" />
                      <CardContent className="p-4">
                        <Skeleton className="h-3 w-16 mb-2" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3 mt-2" />
                      </CardContent>
                    </Card>
                  ))
                ) : filteredDestinations.map((dest, idx) => {
                  const isSelected = selectedDestinations.includes(dest.id);
                  const isExpanded = expandedCard === dest.id;
                  const imageUrl = getDestinationImage(dest);
                  const basePrice = dest.basePrice ? parseFloat(dest.basePrice) : 0;
                  const hotelStars = getHotelStars(dest.id);
                  const mealsInfo = getMealsInfo(dest.id);
                  const tooltipText = getTooltipForCard(dest);
                  const agotado = isBloqueoAgotado(dest);

                  return (
                    <div
                      key={dest.id}
                      className={`rounded-xl transition-all ${agotado ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isSelected ? "ring-4 ring-price-accent ring-offset-2 ring-offset-background" : ""}`}
                      onClick={() => !agotado && toggleDestination(dest.id)}
                    >
                    <Card
                      variant="glass"
                      className={`transition-all hover:shadow-glow overflow-hidden ${isSelected ? "bg-accent/40 shadow-glow" : ""}`}
                      onMouseEnter={() => setExpandedCard(dest.id)}
                      onMouseLeave={() => setExpandedCard(null)}
                      data-testid={`destination-card-${dest.id}`}
                    >
                      <div className="aspect-video w-full bg-muted relative overflow-hidden">
                        {imageUrl && (
                          <OptimizedImage
                            src={imageUrl}
                            alt={dest.name}
                            priority={idx < 6}
                            containerClassName="aspect-video w-full"
                            imageClassName="object-cover"
                          />
                        )}

                        <div className="absolute top-2 left-2 bg-background/90 dark:bg-background/85 backdrop-blur-sm px-2 py-1 rounded-md border border-border/50 flex items-center gap-1 shadow-sm">
                          <Building2 className="w-3 h-3 text-primary" />
                          <div className="flex">
                            {Array.from({ length: hotelStars }).map((_, i) => (
                              <Star key={`${dest.id}-star-${i}`} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 bg-background/90 dark:bg-background/85 backdrop-blur-sm px-2 py-1 rounded-md border border-border/50 shadow-sm">
                          <div className="flex items-center gap-1 text-xs">
                            <UtensilsCrossed className="w-3 h-3 text-price-accent" />
                            <span className="font-medium text-foreground">
                              {(() => {
                                const parts = [];
                                if (mealsInfo.breakfasts > 0) parts.push(`${mealsInfo.breakfasts} desayuno${mealsInfo.breakfasts > 1 ? 's' : ''}`);
                                if (mealsInfo.lunches > 0) parts.push(`${mealsInfo.lunches} almuerzo${mealsInfo.lunches > 1 ? 's' : ''}`);
                                if (mealsInfo.dinners > 0) parts.push(`${mealsInfo.dinners} cena${mealsInfo.dinners > 1 ? 's' : ''}`);
                                return parts.length > 0 ? parts.join(' + ') : `${mealsInfo.total} comida${mealsInfo.total > 1 ? 's' : ''}`;
                              })()}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-10">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="text-xs font-medium text-muted-foreground uppercase mb-1">{dest.country}</div>
                        <h4 className="font-bold text-lg mb-2 text-foreground">{dest.name}</h4>

                        <div className="flex items-baseline justify-between gap-2 mb-3 border-t border-b border-border py-3">
                          <div className="text-xs font-medium text-muted-foreground uppercase">
                            {dest.isBloqueo ? "Precio fijo" : "Precio desde"}
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-extrabold text-price-accent">
                              US$ {basePrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                            <div className="text-xs font-medium text-muted-foreground mt-0.5">Porción terrestre</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{dest.duration} Días / {dest.nights} Noches</span>
                          </div>

                          {dest.priceTiers && dest.priceTiers.length > 0 && !dest.isBloqueo && dest.name !== "Turquía Esencial" && dest.name !== "Tour Cusco Aventura" && (
                            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                              PRECIO DINÁMICO
                            </Badge>
                          )}
                        </div>

                        {dest.isBloqueo && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {dest.bloqueoSalidaFecha && (
                              <Badge variant="secondary" className="text-xs">
                                Salida {new Date(dest.bloqueoSalidaFecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                              </Badge>
                            )}
                            {dest.bloqueoCuposDisponibles != null && (
                              <Badge variant={agotado ? "destructive" : "outline"} className="text-xs">
                                {agotado ? "Agotado" : `${dest.bloqueoCuposDisponibles} cupos`}
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full mt-3 gap-2 border-primary/25 hover:bg-primary/5"
                          disabled={agotado}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLocation(`/plan/${dest.id}`);
                          }}
                          data-testid={`button-plan-detail-${dest.id}`}
                        >
                          <BookOpen className="h-4 w-4 shrink-0" />
                          Ficha del plan
                        </Button>
                      </CardContent>

                      {isExpanded && (
                        <div className="bg-accent border-t border-border p-4">
                          <p className="text-sm text-foreground">{tooltipText}</p>
                        </div>
                      )}
                    </Card>
                    </div>
                  );
                })}
              </div>

              {filteredDestinations.length === 0 && !destinationsQueryError && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {destinations.length === 0
                      ? "No hay planes activos en el catálogo. En admin, activa los planes (interruptor «activo») o revisa la base de datos."
                      : `No hay ${selectedCategory === "bloqueos" ? "bloqueos" : "destinos"} en esta pestaña con el filtro actual.`}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {selectedDestinations.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl"
                onClick={() => {
                  // Formatear fecha en zona horaria local para evitar problemas de UTC
                  const formatLocalDate = (date: Date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };

                  const selectedData = {
                    destinations: selectedDestinations,
                    startDate: startDate ? formatLocalDate(startDate) : "",
                  };
                  sessionStorage.setItem("quoteData", JSON.stringify(selectedData));
                  setLocation("/cotizacion");
                }}
                data-testid="button-continue"
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                Continuar a Cotización
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
