import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Save } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  duration: number;
}

interface QuoteDestination {
  id: string;
  destinationId: string;
  startDate: string;
  passengers: number;
  price: string;
  destination: Destination;
}

interface Quote {
  id: string;
  clientId: string;
  totalPrice: string;
  originCity: string | null;
  flightsAndExtras: string | null;
  outboundFlightImages: string[] | null;
  returnFlightImages: string[] | null;
  status: string;
  client: Client;
  destinations: QuoteDestination[];
}

export default function QuoteEdit() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/advisor/quotes/:id/edit");
  const quoteId = params?.id;
  const { toast } = useToast();

  const [clientId, setClientId] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [flightsAndExtras, setFlightsAndExtras] = useState("");
  const [outboundImages, setOutboundImages] = useState<string[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploadingOutbound, setUploadingOutbound] = useState(false);
  const [uploadingReturn, setUploadingReturn] = useState(false);

  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar la cotización");
      return response.json();
    },
    enabled: !!quoteId,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
    queryFn: async () => {
      const response = await fetch("/api/admin/clients", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al cargar clientes");
      return response.json();
    },
  });

  useEffect(() => {
    if (quote) {
      setClientId(quote.clientId);
      setTotalPrice(quote.totalPrice);
      setOriginCity(quote.originCity || "");
      setFlightsAndExtras(quote.flightsAndExtras || "");
      setOutboundImages(quote.outboundFlightImages || []);
      setReturnImages(quote.returnFlightImages || []);
    }
  }, [quote]);

  const updateQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al actualizar la cotización");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cotización actualizada",
        description: "Los cambios se han guardado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
      setLocation(`/advisor/quotes/${quoteId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la cotización",
        variant: "destructive",
      });
    },
  });

  const handleOutboundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingOutbound(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        
        const { url } = await response.json();
        uploadedUrls.push(url);
      }
      
      setOutboundImages([...outboundImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo de ida guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingOutbound(false);
      e.target.value = "";
    }
  };

  const handleReturnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingReturn(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Upload failed");
        }
        
        const { url } = await response.json();
        uploadedUrls.push(url);
      }
      
      setReturnImages([...returnImages, ...uploadedUrls]);
      
      toast({
        title: "Imágenes subidas",
        description: `${files.length} imagen(es) del vuelo de regreso guardadas`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron subir algunas imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploadingReturn(false);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    if (!clientId || !totalPrice) {
      toast({
        title: "Error",
        description: "El cliente y el precio total son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (!quote) return;

    const updateData = {
      clientId,
      totalPrice: parseFloat(totalPrice),
      originCity: originCity || null,
      flightsAndExtras: flightsAndExtras ? parseFloat(flightsAndExtras) : null,
      outboundFlightImages: outboundImages.length > 0 ? outboundImages : null,
      returnFlightImages: returnImages.length > 0 ? returnImages : null,
      destinations: quote.destinations.map(qd => ({
        destinationId: qd.destinationId,
        startDate: qd.startDate.split("T")[0],
        passengers: qd.passengers,
        price: parseFloat(qd.price),
      })),
    };

    updateQuoteMutation.mutate(updateData);
  };

  if (isLoading || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center gap-4 p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Editar Cotización</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/advisor/quotes/${quoteId}`)}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateQuoteMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateQuoteMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Precio Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">US$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(e.target.value)}
                      data-testid="input-total-price"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ciudad de Origen y Retorno</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="text"
                    placeholder="MED - BOG - PEI"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value.toUpperCase())}
                    data-testid="input-origin-city"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vuelos, Asistencia y Comisión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">US$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={flightsAndExtras}
                      onChange={(e) => setFlightsAndExtras(e.target.value)}
                      data-testid="input-flights-extras"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vuelos de Ida</CardTitle>
                </CardHeader>
                <CardContent>
                  {outboundImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                      {outboundImages.map((url, idx) => (
                        <div key={idx} className="relative border rounded-md overflow-hidden">
                          <img 
                            src={url} 
                            alt={`Vuelo ida ${idx + 1}`} 
                            className="w-full h-32 object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setOutboundImages(outboundImages.filter((_, i) => i !== idx))}
                            data-testid={`button-remove-outbound-${idx}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="outbound-flight-images"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleOutboundUpload}
                      data-testid="input-outbound-images"
                    />
                    <label htmlFor="outbound-flight-images">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploadingOutbound}
                        asChild
                      >
                        <span>
                          {uploadingOutbound ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Subir Imágenes de Vuelo de Ida
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vuelos de Regreso</CardTitle>
                </CardHeader>
                <CardContent>
                  {returnImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                      {returnImages.map((url, idx) => (
                        <div key={idx} className="relative border rounded-md overflow-hidden">
                          <img 
                            src={url} 
                            alt={`Vuelo regreso ${idx + 1}`} 
                            className="w-full h-32 object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setReturnImages(returnImages.filter((_, i) => i !== idx))}
                            data-testid={`button-remove-return-${idx}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="return-flight-images"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleReturnUpload}
                      data-testid="input-return-images"
                    />
                    <label htmlFor="return-flight-images">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploadingReturn}
                        asChild
                      >
                        <span>
                          {uploadingReturn ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Subir Imágenes de Vuelo de Regreso
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Destinos Seleccionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Los destinos, fechas y pasajeros están bloqueados. Para cambiarlos, crea una nueva cotización.
                  </p>
                  <div className="space-y-3">
                    {quote.destinations.map((qd, index) => (
                      <div key={qd.id} className="p-3 border rounded-lg bg-muted/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {index + 1}. {qd.destination.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {qd.destination.country} • {qd.destination.duration} días
                            </p>
                            <p className="text-sm mt-1">
                              Fecha: {new Date(qd.startDate).toLocaleDateString("es-ES")} • Pasajeros: {qd.passengers}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${parseFloat(qd.price).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">por persona</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
