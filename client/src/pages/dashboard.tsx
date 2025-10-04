import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Plus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Quote, Destination } from "@shared/schema";

export default function Dashboard() {
  const { data: quotes = [], isLoading: loadingQuotes } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: destinations = [], isLoading: loadingDestinations } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const stats = [
    {
      title: "Total Cotizaciones",
      value: quotes.length,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      title: "Borradores",
      value: quotes.filter((q) => q.status === "draft").length,
      icon: FileText,
      color: "text-yellow-600",
    },
    {
      title: "Destinos Activos",
      value: destinations.filter((d) => d.isActive).length,
      icon: MapPin,
      color: "text-green-600",
    },
  ];

  const recentQuotes = quotes.slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Bienvenido al sistema de gestión de cotizaciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {loadingQuotes || loadingDestinations ? "-" : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0 pb-4">
            <CardTitle className="text-xl font-serif">Cotizaciones Recientes</CardTitle>
            <Link href="/quotes/new">
              <Button size="sm" data-testid="button-new-quote">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cotización
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingQuotes ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : recentQuotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones aún
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <Link key={quote.id} href={`/quotes/${quote.id}`}>
                    <div className="p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer" data-testid={`quote-card-${quote.id}`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium">{quote.clientName}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          quote.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quote.clientEmail || "Sin email"}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="font-mono text-sm font-medium">
                          {quote.currency} {quote.totalPrice}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(quote.createdAt!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap space-y-0 pb-4">
            <CardTitle className="text-xl font-serif">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/quotes/new">
              <Button variant="outline" className="w-full justify-start" size="lg" data-testid="button-quick-new-quote">
                <Plus className="w-5 h-5 mr-3" />
                Crear Nueva Cotización
              </Button>
            </Link>
            <Link href="/quotes">
              <Button variant="outline" className="w-full justify-start" size="lg" data-testid="button-view-quotes">
                <FileText className="w-5 h-5 mr-3" />
                Ver Todas las Cotizaciones
              </Button>
            </Link>
            <Link href="/destinations">
              <Button variant="outline" className="w-full justify-start" size="lg" data-testid="button-manage-destinations">
                <MapPin className="w-5 h-5 mr-3" />
                Gestionar Destinos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
