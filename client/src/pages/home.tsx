import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { type Destination } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Clock, ArrowRight, AlertCircle, Info, Menu, Building2, UtensilsCrossed, Star } from "lucide-react";
import { getDestinationImage } from "@/lib/destination-images";
import { DatePicker } from "@/components/ui/date-picker";
import { isTuesday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { isTurkeyHoliday, getTurkeyHolidayDescription } from "@/lib/turkey-holidays";

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
  const { toast } = useToast();

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });
  
  const [destinationDetails, setDestinationDetails] = useState<Record<string, DestinationDetail>>({});
  
  useEffect(() => {
    const loadDestinationDetails = async () => {
      for (const dest of destinations) {
        if (!destinationDetails[dest.id]) {
          try {
            const response = await fetch(`/api/destinations/${dest.id}`);
            if (response.ok) {
              const data = await response.json();
              setDestinationDetails(prev => ({
                ...prev,
                [dest.id]: {
                  destination: dest,
                  hotels: data.hotels || [],
                  itinerary: data.itinerary || [],
                }
              }));
            }
          } catch (error) {
            console.error(`Error loading details for ${dest.id}:`, error);
          }
        }
      }
    };
    
    if (destinations.length > 0) {
      loadDestinationDetails();
    }
  }, [destinations]);

  const selectedDests = destinations.filter((d) => selectedDestinations.includes(d.id));
  
  const hasTurkeyDestinations = selectedDests.some((d) => d.requiresTuesday);
  const hasTurkeyEsencial = selectedDests.some((d) => d.name === "Turquía Esencial");
  const hasGranTourEuropa = selectedDests.some((d) => d.name === "Gran Tour de Europa");
  const hasAllowedDaysRestriction = selectedDests.some((d) => d.allowedDays && d.allowedDays.length > 0);
  const allowedDaysDestination = selectedDests.find((d) => d.allowedDays && d.allowedDays.length > 0);
  
  const turkeyDestinations = selectedDests.filter((d) => d.requiresTuesday);
  const otherDestinations = selectedDests.filter((d) => !d.requiresTuesday);

  useEffect(() => {
    if (hasTurkeyDestinations && selectedDestinations.length > 0) {
      const reorderedIds = [
        ...turkeyDestinations.map((d) => d.id),
        ...otherDestinations.map((d) => d.id),
      ];
      
      if (JSON.stringify(reorderedIds) !== JSON.stringify(selectedDestinations)) {
        setSelectedDestinations(reorderedIds);
      }
    }
  }, [selectedDestinations, hasTurkeyDestinations, turkeyDestinations, otherDestinations]);

  const calculateEndDate = (): string => {
    if (!startDate || selectedDestinations.length === 0) return "";
    
    let totalDuration = selectedDestinations.reduce((sum, destId) => {
      const dest = destinations.find((d) => d.id === destId);
      let duration = dest?.duration || 0;
      
      // Ajuste especial para Turquía Esencial
      if (dest?.name === "Turquía Esencial") {
        const dayOfWeek = startDate.getDay();
        // Si es martes (día 2): vuelo desde Colombia, son 11 días
        // Si es miércoles (día 3): llegada directa, son 10 días
        if (dayOfWeek === 2) {
          duration = 11; // Martes: incluye día de vuelo
        } else if (dayOfWeek === 3) {
          duration = 10; // Miércoles: llegada directa
        }
      }
      
      // Ajuste especial para Gran Tour de Europa
      if (dest?.name === "Gran Tour de Europa") {
        const dayOfWeek = startDate.getDay();
        // Si es domingo (día 0): vuelo desde Colombia, son 17 días
        // Si es lunes (día 1): llegada directa, son 16 días
        if (dayOfWeek === 0) {
          duration = 17; // Domingo: incluye día de vuelo
        } else if (dayOfWeek === 1) {
          duration = 16; // Lunes: llegada directa
        }
      }
      
      return sum + duration;
    }, 0);

    // No agregar día extra si ya se ajustó en Turquía o Gran Tour
    const hasTurkeyEsencialAdjusted = selectedDests.some(d => 
      d.name === "Turquía Esencial" && (startDate.getDay() === 1 || startDate.getDay() === 2)
    );
    
    if (hasTurkeyDestinations && !hasTurkeyEsencialAdjusted) {
      totalDuration += 1;
    }

    if (totalDuration === 0) return "";

    const end = new Date(startDate);
    end.setDate(end.getDate() + totalDuration - 1);
    
    return end.toISOString().split("T")[0];
  };

  const endDate = calculateEndDate();

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

  const disableDates = (date: Date) => {
    // Disable past dates
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true;
    }
    
    // For destinations with specific allowed days (e.g., Egypt: Monday and Friday only)
    if (hasAllowedDaysRestriction && allowedDaysDestination?.allowedDays) {
      // First check if it's an allowed day of the week
      if (!isAllowedDay(date, allowedDaysDestination.allowedDays)) {
        return true;
      }
      
      // If priceTiers exist, only allow dates that are exactly in the list
      if (allowedDaysDestination.priceTiers && allowedDaysDestination.priceTiers.length > 0) {
        const dateStr = date.toISOString().split('T')[0];
        
        // Check if this exact date exists in priceTiers
        const hasExactDate = allowedDaysDestination.priceTiers.some(tier => tier.endDate === dateStr);
        
        if (!hasExactDate) {
          return true; // Disable if not in the specific list
        }
      }
      
      return false;
    }
    
    // For Turkey Esencial, allow Tuesday (flight day) or Wednesday (direct arrival)
    if (hasTurkeyEsencial) {
      if (isTurkeyHoliday(date)) {
        return true;
      }
      const dayOfWeek = date.getDay();
      // Allow Tuesday (2) for Colombia flights and Wednesday (3) for direct arrivals
      return !(dayOfWeek === 2 || dayOfWeek === 3);
    }
    
    // For Gran Tour de Europa, allow Sunday (flight day) or Monday (direct arrival)
    if (hasGranTourEuropa) {
      const dayOfWeek = date.getDay();
      // Allow Sunday (0) for Colombia flights and Monday (1) for direct arrivals
      return !(dayOfWeek === 0 || dayOfWeek === 1);
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

  const getHotelStars = (destId: string): number => {
    const dest = destinations.find(d => d.id === destId);
    if (dest?.name === "Turquía Esencial") {
      return 4;
    }

    const details = destinationDetails[destId];
    if (!details || !details.hotels || details.hotels.length === 0) return 4;
    
    const starCounts = details.hotels.map(hotel => {
      if (!hotel.category) return 4;
      const match = hotel.category.match(/(\d+)\s*\*/);
      return match ? parseInt(match[1]) : 4;
    });
    
    return Math.max(...starCounts, 4);
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
    
    // Para Turquía Esencial, usar valores específicos del plan
    if (dest?.name === "Turquía Esencial") {
      return { breakfasts: 9, lunches: 0, dinners: 5, total: 14 };
    }
    
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
          if (lowerMeal.includes('almuerzo') || lowerMeal.includes('lunch') || lowerMeal.includes('comida')) lunches++;
          if (lowerMeal.includes('cena') || lowerMeal.includes('dinner')) dinners++;
        });
      }
    });
    
    if (breakfasts === 0 && dest?.nights) {
      breakfasts = dest.nights;
    }
    
    return { breakfasts, lunches, dinners, total: breakfasts + lunches + dinners };
  };
  
  const getTooltipContent = (dest: Destination): string => {
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
      return "Salidas todos los miércoles del año. Sabados entre marzo a nov 2026. Si vendes con vuelo, debes cotizar salida los martes y viernes desde Colombia. Programa terrestre con acompañamiento de guía habla hispana en destino";
    }
    
    if (dest.requiresTuesday) {
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
    const matchesCategory = selectedCategory === "promociones" 
      ? dest.isPromotion 
      : dest.category === selectedCategory;
    
    const matchesSearch = searchQuery === "" || 
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const toggleDestination = (destId: string) => {
    const dest = destinations.find((d) => d.id === destId);
    
    if (selectedDestinations.includes(destId)) {
      // Deseleccionar el destino actual
      setSelectedDestinations(selectedDestinations.filter((id) => id !== destId));
    } else {
      // Verificar si ya hay un destino del mismo país seleccionado (excepto Colombia para destinos nacionales)
      if (dest?.category === "internacional" && dest?.country !== "Colombia") {
        const sameCountrySelected = selectedDests.find((d) => d.country === dest.country && d.id !== destId);
        if (sameCountrySelected) {
          // Deseleccionar el destino anterior del mismo país y seleccionar el nuevo
          const updatedSelections = selectedDestinations.filter((id) => id !== sameCountrySelected.id);
          
          toast({
            title: "Destino reemplazado",
            description: `Se ha deseleccionado "${sameCountrySelected.name}" y seleccionado "${dest.name}" de ${dest.country}.`,
          });
          
          setSelectedDestinations([...updatedSelections, destId]);
          return;
        }
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
      
      if (dest?.requiresTuesday && startDate && !isTuesday(startDate)) {
        const dateStr = startDate.toLocaleDateString("es-CO", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        
        toast({
          title: "Planes de Turquía solo los Martes",
          description: `La fecha seleccionada (${dateStr}) no es un martes. Los vuelos desde Colombia salen martes y llegan miércoles a Turquía debido al cambio horario (+1 día adicional). Por favor, selecciona una fecha que sea martes para poder incluir destinos de Turquía.`,
          variant: "destructive",
        });
        
        setStartDate(undefined);
        return;
      }
      
      setSelectedDestinations([...selectedDestinations, destId]);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="bg-white shadow-md border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <h1 className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight">
                  Cosmos <span className="text-blue-400 font-light">Mayorista</span>
                </h1>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50 to-white">
            <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {hasTurkeyEsencial && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
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
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
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
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
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
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha de Finalización (Calculada Automáticamente)
              </label>
              <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-700 flex items-center" data-testid="text-end-date">
                {endDate ? (
                  <span className="font-medium">
                    {new Date(endDate + "T00:00:00").toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Selecciona fecha de inicio y destinos</span>
                )}
              </div>
              {endDate && selectedDestinations.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Basado en {selectedDestinations.reduce((sum, destId) => {
                    const dest = destinations.find((d) => d.id === destId);
                    return sum + (dest?.duration || 0);
                  }, 0)}{hasTurkeyDestinations && " +1 día"} de viaje
                  {hasTurkeyDestinations && <span className="text-orange-600"> (incluye día de vuelo a Turquía)</span>}
                </p>
              )}
            </div>
          </div>

          {selectedDestinations.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Destinos Seleccionados:</p>
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

        <div className="mb-8 max-w-lg mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar destinos por nombre o país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              data-testid="input-search-destinations"
            />
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="nacional" data-testid="tab-nacional">
              Colombia
            </TabsTrigger>
            <TabsTrigger value="internacional" data-testid="tab-internacional">
              Planes Internacionales
            </TabsTrigger>
            <TabsTrigger value="promociones" data-testid="tab-promociones">
              Promociones
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDestinations.map((dest) => {
                const isSelected = selectedDestinations.includes(dest.id);
                const isExpanded = expandedCard === dest.id;
                const imageUrl = getDestinationImage(dest);
                const basePrice = dest.basePrice ? parseFloat(dest.basePrice) : 0;
                const hotelStars = getHotelStars(dest.id);
                const mealsInfo = getMealsInfo(dest.id);
                const tooltipText = getTooltipContent(dest);
                
                return (
                  <Card
                    key={dest.id}
                    className={`transition-all hover:shadow-xl overflow-hidden cursor-pointer ${
                      isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                    }`}
                    onMouseEnter={() => setExpandedCard(dest.id)}
                    onMouseLeave={() => setExpandedCard(null)}
                    onClick={() => toggleDestination(dest.id)}
                    data-testid={`destination-card-${dest.id}`}
                  >
                        <div className="aspect-video w-full bg-gray-200 relative overflow-hidden">
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          
                          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-blue-600" />
                            <div className="flex">
                              {Array.from({ length: hotelStars }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          
                          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-md">
                            <div className="flex items-center gap-1 text-xs">
                              <UtensilsCrossed className="w-3 h-3 text-orange-600" />
                              <span className="font-medium text-gray-700">
                                {(() => {
                                  const parts = [];
                                  if (mealsInfo.breakfasts > 0) parts.push(`${mealsInfo.breakfasts} desayuno${mealsInfo.breakfasts > 1 ? 's' : ''}`);
                                  // Skip lunches for Turquía Esencial plan
                                  if (mealsInfo.lunches > 0 && dest.name !== 'Turquía Esencial') parts.push(`${mealsInfo.lunches} almuerzo${mealsInfo.lunches > 1 ? 's' : ''}`);
                                  if (mealsInfo.dinners > 0) parts.push(`${mealsInfo.dinners} cena${mealsInfo.dinners > 1 ? 's' : ''}`);
                                  return parts.length > 0 ? parts.join(' + ') : `${mealsInfo.total} comida${mealsInfo.total > 1 ? 's' : ''}`;
                                })()}
                              </span>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg z-10">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">{dest.country}</div>
                          <h4 className="font-bold text-lg mb-2 text-gray-800">{dest.name}</h4>
                          
                          <div className="flex items-baseline justify-between gap-2 mb-3 border-t border-b border-gray-200 py-3">
                            <div className="text-xs text-gray-500 uppercase">
                              Precio desde
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-extrabold text-orange-500">
                                US$ {basePrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <div className="text-xs text-gray-500">Porción terrestre</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{dest.duration} Días / {dest.nights} Noches</span>
                            </div>
                            
                            {dest.priceTiers && dest.priceTiers.length > 0 && dest.name !== "Turquía Esencial" && (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                PRECIO DINÁMICO
                              </Badge>
                            )}
                          </div>
                          
                          {dest.isPromotion && (
                            <Badge variant="destructive" className="mt-2">
                              ¡Promoción!
                            </Badge>
                          )}
                        </CardContent>
                        
                        {isExpanded && (
                          <div className="bg-blue-50 border-t border-blue-100 p-4">
                            <p className="text-sm text-gray-700">{tooltipText}</p>
                          </div>
                        )}
                      </Card>
                );
              })}
            </div>

            {filteredDestinations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No hay {selectedCategory === "promociones" ? "promociones" : "destinos"} disponibles en este momento.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedDestinations.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl"
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

            <footer className="bg-gray-800 text-white mt-12">
              <div className="container mx-auto px-4 py-8 text-center">
                <p className="text-sm">&copy; 2025 Cosmos Mayorista. Todos los derechos reservados.</p>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
