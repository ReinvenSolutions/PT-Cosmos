import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FileText, Trash2, Search, Edit } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatUSD } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Cotización eliminada",
        description: "La cotización se eliminó correctamente",
      });
      setDeleteQuoteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cotización",
        variant: "destructive",
      });
    },
  });

  const filteredQuotes = quotes?.filter((quote) => {
    const matchesSearch = searchQuery === "" || 
      quote.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClient = clientFilter === "" || 
      quote.client.name.toLowerCase().includes(clientFilter.toLowerCase());
    
    return matchesSearch && matchesClient;
  }) || [];

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
            {quotes && quotes.length > 0 && (
              <div className="mb-6 space-y-4">
                <div className="relative max-w-md">
                  <Input
                    type="text"
                    placeholder="Buscar por cliente o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-quotes"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            )}

            {isLoading ? (
              <p>Cargando cotizaciones...</p>
            ) : filteredQuotes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredQuotes.map((quote) => (
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
                            ${formatUSD(quote.totalPrice)}
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
                        <div className="flex gap-2 mt-2">
                          <Link href={`/advisor/quotes/${quote.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              data-testid={`button-view-quote-${quote.id}`}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </Link>
                          <Link href={`/advisor/quotes/${quote.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-edit-quote-${quote.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteQuoteId(quote.id)}
                            data-testid={`button-delete-quote-${quote.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : quotes && quotes.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No se encontraron cotizaciones que coincidan con tu búsqueda.
                  </p>
                </CardContent>
              </Card>
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
          
          <AlertDialog open={deleteQuoteId !== null} onOpenChange={(open) => !open && setDeleteQuoteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La cotización será eliminada permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteQuoteId && deleteMutation.mutate(deleteQuoteId)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
