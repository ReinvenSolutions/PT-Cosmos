import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { type Destination } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, ArrowRight, AlertCircle, Info, Building2, UtensilsCrossed, Star, Stethoscope, Landmark, ExternalLink, BookOpen } from "lucide-react";
import { getDestinationImage } from "@/lib/destination-images";
import { useToast } from "@/hooks/use-toast";
import { GroupDiscountBanner } from "@/components/group-discount-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/optimized-image";
import { clearHomeBuilderSelection } from "@/lib/home-selection-storage";
import { cn } from "@/lib/utils";
import { getPlanCardTooltip } from "@shared/planCardTooltip";
import {
  DAVIVIENDA_PAYMENTS_URL,
  MEDICAL_ASSISTANCE_PORTAL_URL,
} from "@shared/externalServices";

interface DestinationDetail {
  destination: Destination;
  hotels: any[];
  itinerary: any[];
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("internacional");
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
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
    clearHomeBuilderSelection();
  }, []);

  useEffect(() => {
    if (destinationsWithPreviews.length === 0) return;
    const validIds = new Set(destinationsWithPreviews.map((d) => d.id));
    setSelectedDestinations((prev) => prev.filter((id) => validIds.has(id)));
  }, [destinationsWithPreviews]);

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

  const otherDestinations = selectedDests.filter(
    (d) =>
      !d.country?.toLowerCase().includes("turquía") &&
      !d.country?.toLowerCase().includes("turquia")
  );

  const showBuilderPanel =
    hasTurkeyEsencial ||
    hasGranTourEuropa ||
    (hasTurkeyDestinations && !hasTurkeyEsencial) ||
    selectedDestinations.length > 0;

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

  const getTooltipForCard = (dest: Destination): string => getPlanCardTooltip(dest, destinations);

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

      setSelectedDestinations([...selectedDestinations, destId]);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <GroupDiscountBanner />

      <div className="bg-background/80 backdrop-blur-sm border-b border-border/50 py-3 px-4 shadow-sm">
        <div className="container mx-auto max-w-lg">
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar destinos por nombre o país..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full border-2 pl-12 text-base shadow-sm"
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
                href={MEDICAL_ASSISTANCE_PORTAL_URL}
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
                href={DAVIVIENDA_PAYMENTS_URL}
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

          {showBuilderPanel && (
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
          )}

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

                        {dest.agencyDisplayName && (
                          <Badge
                            className="absolute top-2 right-2 z-10 text-xs font-semibold shadow-md bg-violet-600 hover:bg-violet-600 text-white border-0 max-w-[calc(100%-1rem)] truncate"
                            title={`Plan de proveedor: ${dest.agencyDisplayName}`}
                          >
                            {dest.agencyDisplayName}
                          </Badge>
                        )}

                        {isSelected && (
                          <div
                            className={cn(
                              "absolute w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg z-10",
                              dest.agencyDisplayName ? "top-10 right-2" : "top-2 right-2"
                            )}
                          >
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
                  const selectedData = {
                    destinations: selectedDestinations,
                    startDate: "",
                  };
                  sessionStorage.setItem("quoteData", JSON.stringify(selectedData));
                  clearHomeBuilderSelection();
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
