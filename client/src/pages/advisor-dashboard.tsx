import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

interface Quote {
  id: string;
  clientId: string;
  userId: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export default function AdvisorDashboard() {
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

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
              <h1 className="text-xl font-semibold">Mis Cotizaciones</h1>
            </div>
            <Link href="/">
              <Button data-testid="button-new-quote">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cotización
              </Button>
            </Link>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <p>Cargando cotizaciones...</p>
            ) : quotes && quotes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quotes.map((quote) => (
                  <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{quote.client.name}</CardTitle>
                      <CardDescription>{quote.client.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-semibold">
                            ${Number(quote.totalPrice).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Estado:</span>
                          <span className="capitalize">{quote.status}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Fecha:</span>
                          <span>
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Link href={`/advisor/quotes/${quote.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            data-testid={`button-view-quote-${quote.id}`}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No tienes cotizaciones guardadas aún.
                  </p>
                  <div className="flex justify-center mt-4">
                    <Link href="/">
                      <Button data-testid="button-create-first-quote">
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primera Cotización
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
