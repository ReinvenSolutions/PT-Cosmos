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
      return sum + (dest?.duration || 0);
    }, 0);

    if (hasTurkeyDestinations) {
      totalDuration += 1;
    }

    if (totalDuration === 0) return "";

    const end = new Date(startDate);
    end.setDate(end.getDate() + totalDuration - 1);
    
    return end.toISOString().split("T")[0];
  };

  const endDate = calculateEndDate();

  const disableDates = (date: Date) => {
    if (hasTurkeyDestinations) {
      return !isTuesday(date) || date < new Date(new Date().setHours(0, 0, 0, 0));
    }
    return date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const getHotelStars = (destId: string): number => {
    const details = destinationDetails[destId];
    if (!details || !details.hotels || details.hotels.length === 0) return 4;
    
    const starCounts = details.hotels.map(hotel => {
      if (!hotel.category) return 4;
      const match = hotel.category.match(/(\d+)\s*\*/);
      return match ? parseInt(match[1]) : 4;
    });
    
    return Math.max(...starCounts, 4);
  };
  
  const getMealsInfo = (destId: string): { breakfasts: number; lunches: number; dinners: number; total: number } => {
    const details = destinationDetails[destId];
    if (!details || !details.itinerary || details.itinerary.length === 0) {
      const dest = destinations.find(d => d.id === destId);
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
    
    const dest = destinations.find(d => d.id === destId);
    if (breakfasts === 0 && dest?.nights) {
      breakfasts = dest.nights;
    }
    
    return { breakfasts, lunches, dinners, total: breakfasts + lunches + dinners };
  };
  
  const getTooltipContent = (dest: Destination): string => {
    if (dest.requiresTuesday) {
      const otherCountries = Array.from(new Set(
        destinations
          .filter(d => d.category === "internacional" && d.country !== dest.country && d.country !== "Colombia")
          .map(d => d.country)
      )).join(", ");
      
      return `Salidas todos los miércoles. Combinable con: ${otherCountries || "otros destinos"} (salidas diarias). Turquía siempre va primero en la ruta.`;
    }
    
    return `Salidas diarias. Combinable con todos los destinos. Si combinas con Turquía, ten en cuenta que Turquía tiene salidas los miércoles y será el primer destino en tu ruta.`;
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

  const groupedByCountry = filteredDestinations.reduce((acc, dest) => {
    if (!acc[dest.country]) {
      acc[dest.country] = [];
    }
    acc[dest.country].push(dest);
    return acc;
  }, {} as Record<string, Destination[]>);

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
                  Cosmos <span className="text-blue-400 font-light">Industria de Viajes</span>
                </h1>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50 to-white">
            <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="text-center mb-12">
          <span className="text-blue-500 text-lg font-semibold uppercase">Cotiza tu Aventura</span>
          <h2 className="text-5xl font-extrabold text-gray-800 mt-2 mb-4">Descubre el Mundo con Cosmos</h2>
          
          <div className="max-w-4xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8 mb-8">
            <p className="text-gray-700 leading-relaxed">
              <strong className="text-blue-600">Porciones terrestres garantizadas desde 2 pax</strong> en cualquiera de nuestros programas, sean nacionales o internacionales.
              Incluyen: <span className="font-semibold">guía de habla hispana garantizada desde 2 pax, asistencia al viajero, hoteles, transporte, actividades, impuestos y complementos de programas</span>.
            </p>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Solo montamos vuelos - cotización terrestre únicamente</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {hasTurkeyDestinations && (
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
                {hasTurkeyDestinations && <Badge variant="secondary" className="ml-2">Solo Martes</Badge>}
              </label>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder={hasTurkeyDestinations ? "Selecciona un martes" : "Selecciona una fecha"}
                disabled={disableDates}
              />
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
              Planes Nacionales
            </TabsTrigger>
            <TabsTrigger value="internacional" data-testid="tab-internacional">
              Planes Internacionales
            </TabsTrigger>
            <TabsTrigger value="promociones" data-testid="tab-promociones">
              Promociones
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-8">
            {Object.entries(groupedByCountry).map(([country, dests]) => (
              <div key={country} className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-2xl font-bold text-gray-800">{country}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dests.map((dest) => {
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
                          className={`transition-all hover:shadow-xl overflow-hidden ${
                            isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                          }`}
                          onMouseEnter={() => setExpandedCard(dest.id)}
                          onMouseLeave={() => setExpandedCard(null)}
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
                                        if (mealsInfo.lunches > 0) parts.push(`${mealsInfo.lunches} almuerzo${mealsInfo.lunches > 1 ? 's' : ''}`);
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
                              <CardContent className="p-4 cursor-pointer" onClick={() => toggleDestination(dest.id)}>
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
                                
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">{dest.duration} Días / {dest.nights} Noches</span>
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
              </div>
            ))}

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
                const selectedData = {
                  destinations: selectedDestinations,
                  startDate: startDate?.toISOString().split("T")[0] || "",
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
                <p className="text-sm">&copy; 2025 Cosmos Industria de Viajes. Todos los derechos reservados.</p>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
