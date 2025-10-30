import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Users, FileText, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface QuoteStat {
  userId: string;
  username: string;
  count: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const { data: stats } = useQuery<QuoteStat[]>({
    queryKey: ["/api/admin/quotes/stats"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string }) => {
      const response = await apiRequest("POST", "/api/admin/clients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado exitosamente",
      });
      setIsDialogOpen(false);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    await createClientMutation.mutateAsync({
      name: clientName,
      email: clientEmail,
      phone: clientPhone || undefined,
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administrador</h1>
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
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Estadísticas de Cotizaciones
              </CardTitle>
              <CardDescription>Cotizaciones por asesor</CardDescription>
            </CardHeader>
            <CardContent>
              {stats && stats.length > 0 ? (
                <div className="space-y-2">
                  {stats.map((stat) => (
                    <div
                      key={stat.userId}
                      className="flex justify-between items-center"
                      data-testid={`stat-advisor-${stat.userId}`}
                    >
                      <span className="font-medium">{stat.username}</span>
                      <span className="text-muted-foreground">
                        {stat.count} cotizaciones
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay cotizaciones registradas aún
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Clientes
              </CardTitle>
              <CardDescription>
                Total: {clients?.length || 0} clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" data-testid="button-create-client">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crear Nuevo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateClient} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        data-testid="input-client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-client-email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono (opcional)</Label>
                      <Input
                        id="phone"
                        data-testid="input-client-phone"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      data-testid="button-submit-client"
                      disabled={createClientMutation.isPending}
                    >
                      {createClientMutation.isPending ? "Creando..." : "Crear Cliente"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {clients && clients.length > 0 ? (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex justify-between items-center p-3 border rounded-md"
                    data-testid={`client-${client.id}`}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      {client.phone && (
                        <p className="text-sm text-muted-foreground">{client.phone}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                No hay clientes registrados aún
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
