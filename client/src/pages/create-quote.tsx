import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { type Destination } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, X, AlertCircle, ArrowLeft } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export default function CreateQuote() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [passengers, setPassengers] = useState<number>(2);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations?isActive=true"],
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/quotes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Cotización creada",
        description: "La cotización se ha guardado exitosamente",
      });
      navigate("/advisor");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cotización",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      });
    },
  });

  const selectedDests = destinations.filter((d) => selectedDestinations.includes(d.id));
  const hasTurkeyDestinations = selectedDests.some((d) => d.requiresTuesday);

  const calculateTotalPrice = (): number => {
    return selectedDests.reduce((sum, dest) => sum + Number(dest.basePrice || 0), 0) * passengers;
  };

  const calculateTotalDuration = (): number => {
    let duration = selectedDests.reduce((sum, dest) => sum + (dest.duration || 0), 0);
    if (hasTurkeyDestinations) {
      duration += 1;
    }
    return duration;
  };

  const isTuesday = (date: Date) => {
    return date.getDay() === 2;
  };

  const disableDates = (date: Date) => {
    if (hasTurkeyDestinations) {
      return !isTuesday(date) || date < new Date(new Date().setHours(0, 0, 0, 0));
    }
    return date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const toggleDestination = (destId: string) => {
    const dest = destinations.find((d) => d.id === destId);
    
    if (selectedDestinations.includes(destId)) {
      setSelectedDestinations(selectedDestinations.filter((id) => id !== destId));
    } else {
      if (dest?.requiresTuesday && startDate && !isTuesday(startDate)) {
        toast({
          title: "Planes de Turquía solo los Martes",
          description: "Por favor, selecciona una fecha que sea martes para incluir destinos de Turquía.",
          variant: "destructive",
        });
        setStartDate(undefined);
        return;
      }
      setSelectedDestinations([...selectedDestinations, destId]);
    }
  };

  const handleCreateQuote = async () => {
    if (!selectedClientId) {
      toast({
        title: "Cliente requerido",
        description: "Por favor, selecciona un cliente",
        variant: "destructive",
      });
      return;
    }

    if (selectedDestinations.length === 0) {
      toast({
        title: "Destinos requeridos",
        description: "Por favor, selecciona al menos un destino",
        variant: "destructive",
      });
      return;
    }

    if (!startDate) {
      toast({
        title: "Fecha requerida",
        description: "Por favor, selecciona una fecha de inicio",
        variant: "destructive",
      });
      return;
    }

    const quoteData = {
      clientId: selectedClientId,
      totalPrice: calculateTotalPrice(),
      destinations: selectedDestinations.map((destId) => ({
        destinationId: destId,
        startDate: startDate.toISOString().split('T')[0],
        passengers: passengers,
      })),
    };

    await createQuoteMutation.mutateAsync(quoteData);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            data-testid="button-back"
            onClick={() => navigate("/advisor")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Crear Nueva Cotización</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fecha de Inicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DatePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  disabled={disableDates}
                />
                {hasTurkeyDestinations && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Los destinos de Turquía requieren salida en martes. Se suma un día adicional por cambio horario.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Número de Pasajeros</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min="1"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  data-testid="input-passengers"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Destinos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {destinations.map((dest) => (
                    <div
                      key={dest.id}
                      className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover-elevate"
                      onClick={() => toggleDestination(dest.id)}
                      data-testid={`destination-${dest.id}`}
                    >
                      <div>
                        <p className="font-medium">{dest.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dest.country} • {dest.duration} días • ${Number(dest.basePrice || 0).toFixed(2)}
                        </p>
                      </div>
                      {selectedDestinations.includes(dest.id) && (
                        <Badge data-testid={`badge-selected-${dest.id}`}>Seleccionado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumen de Cotización</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-medium" data-testid="text-selected-client">
                    {selectedClientId 
                      ? clients.find(c => c.id === selectedClientId)?.name 
                      : "No seleccionado"}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Destinos Seleccionados</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDests.length > 0 ? (
                      selectedDests.map((dest) => (
                        <div
                          key={dest.id}
                          className="flex items-center justify-between"
                          data-testid={`summary-destination-${dest.id}`}
                        >
                          <span className="text-sm">{dest.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleDestination(dest.id)}
                            data-testid={`button-remove-${dest.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Ninguno</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Fecha de Inicio</Label>
                  <p className="font-medium flex items-center gap-2" data-testid="text-start-date">
                    <Calendar className="w-4 h-4" />
                    {startDate?.toLocaleDateString() || "No seleccionada"}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Duración Total</Label>
                  <p className="font-medium" data-testid="text-total-duration">
                    {calculateTotalDuration()} días
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Pasajeros</Label>
                  <p className="font-medium" data-testid="text-passengers">
                    {passengers}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Precio Total</Label>
                  <p className="text-2xl font-bold" data-testid="text-total-price">
                    ${calculateTotalPrice().toFixed(2)}
                  </p>
                </div>

                <Button
                  className="w-full"
                  data-testid="button-create-quote"
                  onClick={handleCreateQuote}
                  disabled={createQuoteMutation.isPending}
                >
                  {createQuoteMutation.isPending ? "Guardando..." : "Guardar Cotización"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
