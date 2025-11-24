import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, User, Mail, Phone, Calendar, Users, Plane, Image as ImageIcon, Edit } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { formatUSD, formatDate } from "@shared/schema";

interface Destination {
  id: string;
  name: string;
  country: string;
  duration: number;
  price: string;
  category: string;
  basePrice: string | null;
}

interface QuoteDestination {
  id: string;
  quoteId: string;
  destinationId: string;
  startDate: string;
  passengers: number;
  price: string | null;
  destination: Destination;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface Quote {
  id: string;
  clientId: string;
  userId: string;
  totalPrice: string;
  originCity: string | null;
  flightsAndExtras: string | null;
  outboundFlightImages: string[] | null;
  returnFlightImages: string[] | null;
  customFilename: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: Client;
  destinations: QuoteDestination[];
}

export default function QuoteDetail() {
  const [, params] = useRoute("/advisor/quotes/:id");
  const quoteId = params?.id;

  const { data: quote, isLoading, error } = useQuery<Quote>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Error al cargar la cotización");
      }
      return response.json();
    },
    enabled: !!quoteId,
  });

  const handleDownloadPDF = async () => {
    if (!quoteId) return;
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al descargar el PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const filename = quote?.customFilename 
        ? (quote.customFilename.endsWith('.pdf') ? quote.customFilename : `${quote.customFilename}.pdf`)
        : `cotizacion-${quoteId}.pdf`;
        
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading PDF:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Cargando detalles de la cotización...</p>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se pudo cargar la cotización
            </p>
            <div className="flex justify-center mt-4">
              <Link href="/advisor">
                <Button data-testid="button-back-to-quotes">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver a Mis Cotizaciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
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
              <h1 className="text-xl font-semibold">Detalles de Cotización</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <Link href="/advisor">
                  <Button variant="outline" data-testid="button-back">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/advisor/quotes/${quoteId}/edit`}>
                    <Button variant="outline" data-testid="button-edit">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  <Button onClick={handleDownloadPDF} data-testid="button-download-pdf">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Información del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre</p>
                      <p className="font-medium" data-testid="text-client-name">
                        {quote.client.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium" data-testid="text-client-email">
                        {quote.client.email}
                      </p>
                    </div>
                  </div>
                  {quote.client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium" data-testid="text-client-phone">
                          {quote.client.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Cotización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID de Cotización:</span>
                    <span className="font-mono text-sm" data-testid="text-quote-id">
                      {quote.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha de Creación:</span>
                    <span data-testid="text-quote-date">
                      {formatDate(quote.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <span className="capitalize font-medium" data-testid="text-quote-status">
                      {quote.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-3 border-t">
                    <span>Precio Total:</span>
                    <span data-testid="text-total-price">
                      ${formatUSD(quote.totalPrice)} USD
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Destinos Seleccionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quote.destinations.map((qd, index) => (
                      <div
                        key={qd.id}
                        className="p-4 border rounded-lg"
                        data-testid={`destination-${qd.destination.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {index + 1}. {qd.destination.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {qd.destination.country} • {qd.destination.duration} días
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold" data-testid={`destination-price-${qd.destinationId}`}>
                              ${formatUSD(qd.price || qd.destination.basePrice || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">por persona</p>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Fecha de Inicio</p>
                              <p className="font-medium">
                                {formatDate(qd.startDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Pasajeros</p>
                              <p className="font-medium">{qd.passengers}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-flight-attachments">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Adjuntos de Vuelos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div data-testid="section-outbound-flights">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-600 rotate-45" />
                      Vuelos de Ida
                    </h3>
                    {quote.outboundFlightImages && quote.outboundFlightImages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quote.outboundFlightImages.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            data-testid={`outbound-flight-image-${index}`}
                          >
                            <img
                              src={imageUrl}
                              alt={`Vuelo de ida ${index + 1}`}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-2 bg-muted">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Imagen {index + 1}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-outbound-images">
                        No hay imágenes de vuelos de ida adjuntadas. Puede agregar imágenes editando la cotización.
                      </p>
                    )}
                  </div>
                  
                  <div data-testid="section-return-flights">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-green-600 -rotate-45" />
                      Vuelos de Regreso
                    </h3>
                    {quote.returnFlightImages && quote.returnFlightImages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quote.returnFlightImages.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                            data-testid={`return-flight-image-${index}`}
                          >
                            <img
                              src={imageUrl}
                              alt={`Vuelo de regreso ${index + 1}`}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-2 bg-muted">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Imagen {index + 1}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground" data-testid="text-no-return-images">
                        No hay imágenes de vuelos de regreso adjuntadas. Puede agregar imágenes editando la cotización.
                      </p>
                    )}
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
