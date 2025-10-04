import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Clock, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { Destination } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Destinations() {
  const { toast } = useToast();

  const { data: destinations = [], isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      toast({
        title: "Destino eliminado",
        description: "El destino ha sido eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el destino",
        variant: "destructive",
      });
    },
  });

  const countryColors: Record<string, string> = {
    Turkey: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    Dubai: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    Thailand: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Egypt: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    Greece: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Peru: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    Vietnam: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-destinations-title">
            Destinos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los destinos y paquetes turísticos disponibles
          </p>
        </div>
        <Link href="/destinations/new">
          <Button data-testid="button-new-destination">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Destino
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando destinos...</p>
        </div>
      ) : destinations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay destinos</h3>
            <p className="text-muted-foreground mb-4">
              Comienza agregando tu primer destino
            </p>
            <Link href="/destinations/new">
              <Button data-testid="button-create-first-destination">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Destino
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <Card key={destination.id} className="overflow-hidden" data-testid={`destination-card-${destination.id}`}>
              {destination.imageUrl && (
                <div className="aspect-video w-full bg-muted relative">
                  <img
                    src={destination.imageUrl}
                    alt={destination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <CardTitle className="text-xl">{destination.name}</CardTitle>
                  {!destination.isActive && (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={countryColors[destination.country] || ""}
                  >
                    {destination.country}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {destination.duration}D / {destination.nights}N
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {destination.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {destination.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Link href={`/destinations/${destination.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-destination-${destination.id}`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid={`button-delete-destination-${destination.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar destino?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminarán también el itinerario, hoteles y toda la información relacionada.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(destination.id)}
                          data-testid="button-confirm-delete"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
