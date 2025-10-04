import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Copy } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Quote } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Quotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const duplicateMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("POST", `/api/quotes/${quoteId}/duplicate`, {});
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Cotización duplicada",
        description: "Se ha creado una copia de la cotización",
      });
      setLocation(`/quotes/${newQuote.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo duplicar la cotización",
        variant: "destructive",
      });
    },
  });

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/api/quotes?${params}`);
      if (!response.ok) throw new Error("Failed to fetch quotes");
      return response.json();
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-quotes-title">
            Cotizaciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas tus cotizaciones de viaje
          </p>
        </div>
        <Link href="/quotes/new">
          <Button data-testid="button-new-quote">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cotización
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-quotes"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando cotizaciones...</p>
        </div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay cotizaciones</h3>
            <p className="text-muted-foreground mb-4">
              {search ? "No se encontraron cotizaciones con esos criterios" : "Comienza creando tu primera cotización"}
            </p>
            {!search && (
              <Link href="/quotes/new">
                <Button data-testid="button-create-first-quote">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Cotización
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover-elevate" data-testid={`quote-card-${quote.id}`}>
              <Link href={`/quotes/${quote.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 cursor-pointer active-elevate-2">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{quote.clientName}</CardTitle>
                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                      {quote.clientEmail && <span>{quote.clientEmail}</span>}
                      {quote.clientPhone && <span>{quote.clientPhone}</span>}
                      {quote.adults && (
                        <span>
                          {quote.adults} adulto{quote.adults > 1 ? "s" : ""}
                          {quote.children ? `, ${quote.children} niño${quote.children > 1 ? "s" : ""}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        quote.status === "draft"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : quote.status === "sent"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      }`}
                    >
                      {quote.status}
                    </span>
                    <p className="font-mono text-lg font-semibold">
                      {quote.currency} {quote.totalPrice}
                    </p>
                  </div>
                </CardHeader>
              </Link>
              <CardContent>
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div className="flex-1">
                    {quote.travelStartDate && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Viaje: </span>
                        <span className="font-medium">
                          {new Date(quote.travelStartDate).toLocaleDateString()}
                        </span>
                        {quote.travelEndDate && (
                          <span className="text-muted-foreground"> - {new Date(quote.travelEndDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Creado: {new Date(quote.createdAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateMutation.mutate(quote.id);
                    }}
                    disabled={duplicateMutation.isPending}
                    data-testid={`button-duplicate-${quote.id}`}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
