import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Plus, FileText } from "lucide-react";

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
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de Asesor</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenido, {user?.username}
            </p>
          </div>
          <Button
            variant="outline"
            data-testid="button-logout"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mis Cotizaciones</h2>
          <Link href="/advisor/quotes/new">
            <Button data-testid="button-new-quote">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cotización
            </Button>
          </Link>
        </div>

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
                <Link href="/advisor/quotes/new">
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
  );
}
