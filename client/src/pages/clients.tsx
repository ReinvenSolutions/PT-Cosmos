import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building, Mail, Phone, Plus, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { Client } from "@shared/schema";

export default function Clients() {
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const response = await fetch(`/api/clients?${params}`);
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2" data-testid="text-clients-title">
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu base de datos de clientes
          </p>
        </div>
        <Link href="/clients/new">
          <Button data-testid="button-new-client">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No hay clientes</p>
            <p className="text-muted-foreground mb-4">
              {search
                ? "No se encontraron clientes con ese criterio"
                : "Crea tu primer cliente para comenzar"}
            </p>
            {!search && (
              <Link href="/clients/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Cliente
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover-elevate active-elevate-2 h-full" data-testid={`client-card-${client.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-lg font-medium line-clamp-2">
                    {client.name}
                  </CardTitle>
                  <Badge variant={client.status === "active" ? "default" : "secondary"} className="text-xs">
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.company && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.company}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && !client.company && (
                    <p className="text-sm text-muted-foreground italic">Sin información de contacto</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
