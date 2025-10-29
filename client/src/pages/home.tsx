import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { type Destination } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, ArrowRight, AlertCircle } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("internacional");
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });

  const filteredDestinations = destinations.filter((dest) => {
    if (selectedCategory === "promociones") {
      return dest.isPromotion;
    }
    return dest.category === selectedCategory;
  });

  const groupedByCountry = filteredDestinations.reduce((acc, dest) => {
    if (!acc[dest.country]) {
      acc[dest.country] = [];
    }
    acc[dest.country].push(dest);
    return acc;
  }, {} as Record<string, Destination[]>);

  const toggleDestination = (destId: string) => {
    if (selectedDestinations.includes(destId)) {
      setSelectedDestinations(selectedDestinations.filter((id) => id !== destId));
    } else {
      setSelectedDestinations([...selectedDestinations, destId]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">
            Cosmos <span className="text-blue-400 font-light">Industria de Viajes</span>
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 lg:py-16">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha de Inicio del Viaje
              </label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
                data-testid="input-start-date"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha de Finalización del Viaje
              </label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
                data-testid="input-end-date"
              />
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
                    return (
                      <Card
                        key={dest.id}
                        className={`cursor-pointer transition-all hover:shadow-xl ${
                          isSelected ? "ring-2 ring-blue-500 bg-blue-50" : ""
                        }`}
                        onClick={() => toggleDestination(dest.id)}
                        data-testid={`destination-card-${dest.id}`}
                      >
                        {dest.imageUrl && (
                          <div className="aspect-video w-full bg-gray-200 relative overflow-hidden">
                            <img
                              src={dest.imageUrl}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-lg mb-2 text-gray-800">{dest.name}</h4>
                          {dest.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dest.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{dest.duration} Días / {dest.nights} Noches</span>
                          </div>
                          {dest.isPromotion && (
                            <Badge variant="destructive" className="mt-2">
                              ¡Promoción!
                            </Badge>
                          )}
                        </CardContent>
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
                  startDate,
                  endDate,
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
      </main>

      <footer className="bg-gray-800 text-white mt-12">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm">&copy; 2025 Cosmos Industria de Viajes. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
