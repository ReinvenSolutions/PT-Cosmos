import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, User, Mail, Phone, Calendar, Users } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface Destination {
  id: string;
  name: string;
  country: string;
  duration: number;
  price: string;
  category: string;
}

interface QuoteDestination {
  id: string;
  quoteId: string;
  destinationId: string;
  startDate: string;
  passengers: number;
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
      a.download = `cotizacion-${quoteId}.pdf`;
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
                <Button onClick={handleDownloadPDF} data-testid="button-download-pdf">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
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
                      {new Date(quote.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
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
                      ${Number(quote.totalPrice).toFixed(2)} USD
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
                            <p className="text-lg font-semibold">
                              ${Number(qd.destination.price).toFixed(2)}
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
                                {new Date(qd.startDate).toLocaleDateString("es-ES")}
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
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
