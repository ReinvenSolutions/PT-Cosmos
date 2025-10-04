import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDestinationSchema, type InsertDestination, type Destination, type ItineraryDay, type Hotel, type Inclusion, type Exclusion } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function DestinationEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const destinationId = params.id;
  const isEditing = !!destinationId;

  const [itineraryDays, setItineraryDays] = useState<Partial<ItineraryDay>[]>([]);
  const [hotels, setHotels] = useState<Partial<Hotel>[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);

  const { data: destination, isLoading } = useQuery({
    queryKey: ["/api/destinations", destinationId],
    enabled: isEditing,
    queryFn: async () => {
      const response = await fetch(`/api/destinations/${destinationId}`);
      if (!response.ok) throw new Error("Failed to fetch destination");
      const data = await response.json();
      
      setItineraryDays(data.itinerary || []);
      setHotels(data.hotels || []);
      setInclusions((data.inclusions || []).map((i: Inclusion) => i.item));
      setExclusions((data.exclusions || []).map((e: Exclusion) => e.item));
      
      return data;
    },
  });

  const form = useForm<InsertDestination>({
    resolver: zodResolver(insertDestinationSchema),
    defaultValues: destination || {
      name: "",
      country: "",
      duration: 3,
      nights: 2,
      description: "",
      imageUrl: "",
      displayOrder: 999,
      isActive: true,
    },
    values: destination,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertDestination) => {
      if (isEditing) {
        return await apiRequest("PATCH", `/api/destinations/${destinationId}`, data);
      } else {
        return await apiRequest("POST", "/api/destinations", data);
      }
    },
    onSuccess: async (savedDest: Destination) => {
      const destId = savedDest.id;
      
      if (isEditing) {
        await apiRequest("DELETE", `/api/itinerary/${destinationId}`);
      }
      
      for (const day of itineraryDays) {
        if (day.dayNumber && day.title && day.description) {
          await apiRequest("POST", `/api/destinations/${destId}/itinerary`, {
            ...day,
            destinationId: destId,
          });
        }
      }
      
      for (const hotel of hotels) {
        if (hotel.name) {
          await apiRequest("POST", `/api/destinations/${destId}/hotels`, {
            ...hotel,
            destinationId: destId,
          });
        }
      }
      
      for (const item of inclusions) {
        if (item.trim()) {
          await apiRequest("POST", `/api/destinations/${destId}/inclusions`, {
            item,
            destinationId: destId,
          });
        }
      }
      
      for (const item of exclusions) {
        if (item.trim()) {
          await apiRequest("POST", `/api/destinations/${destId}/exclusions`, {
            item,
            destinationId: destId,
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      toast({
        title: isEditing ? "Destino actualizado" : "Destino creado",
        description: "Los cambios han sido guardados correctamente",
      });
      setLocation("/destinations");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el destino",
        variant: "destructive",
      });
    },
  });

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando destino...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/destinations">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Destinos
          </Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-editor-title">
          {isEditing ? "Editar Destino" : "Nuevo Destino"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Destino *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (días) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Noches *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-nights" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orden</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-displayorder" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Imagen</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="https://..." data-testid="input-imageurl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <p className="text-sm text-muted-foreground">El destino estará disponible para cotizaciones</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>Itinerario</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItineraryDays([...itineraryDays, { dayNumber: itineraryDays.length + 1, title: "", description: "", activities: [], meals: [] }])}
                data-testid="button-add-day"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Día
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itineraryDays.map((day, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Día {day.dayNumber || index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setItineraryDays(itineraryDays.filter((_, i) => i !== index))}
                      data-testid={`button-remove-day-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Título del día"
                    value={day.title || ""}
                    onChange={(e) => {
                      const updated = [...itineraryDays];
                      updated[index] = { ...day, title: e.target.value };
                      setItineraryDays(updated);
                    }}
                    data-testid={`input-day-title-${index}`}
                  />
                  <Textarea
                    placeholder="Descripción del día"
                    value={day.description || ""}
                    onChange={(e) => {
                      const updated = [...itineraryDays];
                      updated[index] = { ...day, description: e.target.value };
                      setItineraryDays(updated);
                    }}
                    rows={2}
                    data-testid={`input-day-description-${index}`}
                  />
                </div>
              ))}
              {itineraryDays.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No hay días agregados</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/destinations">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Destino"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
