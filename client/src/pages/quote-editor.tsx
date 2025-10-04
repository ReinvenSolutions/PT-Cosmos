import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteSchema, type InsertQuote, type Quote, type Destination } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Save, X, FileDown } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function QuoteEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const quoteId = params.id;
  const isEditing = !!quoteId;

  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [showDestinationDialog, setShowDestinationDialog] = useState(false);

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
    queryFn: async () => {
      const response = await fetch("/api/destinations?isActive=true");
      if (!response.ok) throw new Error("Failed to fetch destinations");
      return response.json();
    },
  });

  const { data: quote, isLoading } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    enabled: isEditing,
    queryFn: async () => {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) throw new Error("Failed to fetch quote");
      const data = await response.json();
      
      setSelectedDestinations(data.quoteDestinations?.map((qd: any) => qd.destinationId) || []);
      
      return data;
    },
  });

  const form = useForm<InsertQuote>({
    resolver: zodResolver(insertQuoteSchema),
    defaultValues: quote || {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      totalPrice: "0",
      currency: "USD",
      adults: 2,
      children: 0,
      status: "draft",
      notes: "",
    },
    values: quote,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertQuote) => {
      let savedQuote: Quote;
      
      if (isEditing) {
        savedQuote = await apiRequest("PATCH", `/api/quotes/${quoteId}`, data);
        await apiRequest("DELETE", `/api/quote-destinations/${quoteId}`);
      } else {
        savedQuote = await apiRequest("POST", "/api/quotes", data);
      }
      
      for (let i = 0; i < selectedDestinations.length; i++) {
        await apiRequest("POST", `/api/quotes/${savedQuote.id}/destinations`, {
          destinationId: selectedDestinations[i],
          displayOrder: i,
        });
      }
      
      return savedQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: isEditing ? "Cotización actualizada" : "Cotización creada",
        description: "Los cambios han sido guardados correctamente",
      });
      setLocation("/quotes");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la cotización",
        variant: "destructive",
      });
    },
  });

  const sortedDestinations = [...destinations].sort((a, b) => {
    if (a.country === "Turkey" && b.country !== "Turkey") return -1;
    if (a.country !== "Turkey" && b.country === "Turkey") return 1;
    return a.displayOrder - b.displayOrder;
  });

  const handleExportPDF = async () => {
    if (!quoteId) return;
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`);
      if (!response.ok) throw new Error("Failed to export PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cotizacion-${quote?.clientName.replace(/\s+/g, '-')}-${quoteId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF exportado",
        description: "La cotización ha sido descargada correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el PDF",
        variant: "destructive",
      });
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/quotes">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Cotizaciones
          </Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-editor-title">
          {isEditing ? "Editar Cotización" : "Nueva Cotización"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Cliente *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-clientname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" data-testid="input-clientemail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-clientphone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="adults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adultos</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-adults" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="children"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niños</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-children" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
              <CardTitle>Destinos Seleccionados</CardTitle>
              <Dialog open={showDestinationDialog} onOpenChange={setShowDestinationDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" data-testid="button-add-destination">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Destino
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Seleccionar Destinos</DialogTitle>
                    <DialogDescription>
                      Elige los destinos para esta cotización. Turkey siempre aparece primero.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {sortedDestinations.map((dest) => (
                      <Card
                        key={dest.id}
                        className={`cursor-pointer hover-elevate active-elevate-2 ${
                          selectedDestinations.includes(dest.id) ? "border-primary" : ""
                        }`}
                        onClick={() => {
                          if (selectedDestinations.includes(dest.id)) {
                            setSelectedDestinations(selectedDestinations.filter((id) => id !== dest.id));
                          } else {
                            setSelectedDestinations([...selectedDestinations, dest.id]);
                          }
                        }}
                        data-testid={`destination-option-${dest.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{dest.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {dest.duration}D / {dest.nights}N
                              </Badge>
                            </div>
                            {selectedDestinations.includes(dest.id) && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-primary-foreground text-xs">✓</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button type="button" onClick={() => setShowDestinationDialog(false)} data-testid="button-close-dialog">
                      Cerrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {selectedDestinations.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay destinos seleccionados
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedDestinations.map((destId) => {
                    const dest = destinations.find((d) => d.id === destId);
                    return dest ? (
                      <Badge key={destId} variant="secondary" className="px-3 py-2 text-sm">
                        {dest.name} ({dest.duration}D/{dest.nights}N)
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDestinations(selectedDestinations.filter((id) => id !== destId))
                          }
                          className="ml-2"
                          data-testid={`button-remove-destination-${destId}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Total *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-totalprice" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="PEN">PEN</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="travelStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-startdate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-enddate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="accepted">Aceptado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 flex-wrap">
            <Link href="/quotes">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancelar
              </Button>
            </Link>
            {isEditing && (
              <Button type="button" variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Cotización"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
