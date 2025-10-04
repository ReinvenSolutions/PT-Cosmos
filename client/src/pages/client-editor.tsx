import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, type Client, type Quote } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { Link } from "wouter";

export default function ClientEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const clientId = params.id;
  const isEditing = !!clientId;

  const { data: clientData, isLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: isEditing,
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error("Failed to fetch client");
      return response.json();
    },
  });

  const client = clientData as Client & { quotes?: Quote[]; totalQuotes?: number; acceptedQuotes?: number };

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: client || {
      name: "",
      email: "",
      phone: "",
      company: "",
      notes: "",
      status: "active",
    },
    values: client,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/clients/${clientId}`, data);
      } else {
        return apiRequest("POST", "/api/clients", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: isEditing ? "Cliente actualizado" : "Cliente creado",
        description: "Los cambios han sido guardados correctamente",
      });
      setLocation("/clients");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente",
        variant: "destructive",
      });
    },
  });

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Clientes
          </Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold" data-testid="text-editor-title">
          {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-phone" />
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
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
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

          {isEditing && client?.quotes && client.quotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cotizaciones ({client.totalQuotes || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-mono font-bold">{client.totalQuotes}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-2xl font-mono font-bold text-green-700 dark:text-green-300">{client.acceptedQuotes}</p>
                    <p className="text-sm text-muted-foreground">Aceptadas</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-2xl font-mono font-bold text-blue-700 dark:text-blue-300">
                      {client.acceptedQuotes && client.totalQuotes 
                        ? Math.round((client.acceptedQuotes / client.totalQuotes) * 100)
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Conversión</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {client.quotes.slice(0, 5).map((quote) => (
                    <Link key={quote.id} href={`/quotes/${quote.id}`}>
                      <div className="p-3 rounded-lg border hover-elevate active-elevate-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{quote.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {quote.currency} {quote.totalPrice}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              quote.status === "accepted"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : quote.status === "draft"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}>
                              {quote.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Link href="/clients">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
