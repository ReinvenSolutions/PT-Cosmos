import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserPlus, Search, MoreVertical, Eye, Phone, Mail, Calendar, FileText, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatUSD } from "@shared/schema";

interface Client {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    createdAt: string;
}

interface Quote {
    id: string;
    totalPrice: string;
    createdAt: string;
    includeFlights: boolean;
    destinations: any[];
}

export default function Clients() {
    const [search, setSearch] = useState("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { data: clients, isLoading } = useQuery<Client[]>({
        queryKey: ["/api/admin/clients"],
    });

    const { data: clientQuotes } = useQuery<Quote[]>({
        queryKey: [`/api/admin/quotes/client/${selectedClient?.id}`],
        enabled: !!selectedClient,
    });

    const filteredClients = clients?.filter(client =>
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleViewDetails = (client: Client) => {
        setSelectedClient(client);
        setIsDetailsOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground">
                        Gestiona la información de tus clientes y su historial de cotizaciones.
                    </p>
                </div>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Listado de Clientes</CardTitle>
                            <CardDescription>
                                Tienes un total de {clients?.length || 0} clientes registrados.
                            </CardDescription>
                        </div>
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar cliente..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Fecha de Registro</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        Cargando clientes...
                                    </TableCell>
                                </TableRow>
                            ) : filteredClients?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No se encontraron clientes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClients?.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell>{client.email}</TableCell>
                                        <TableCell>{client.phone || "N/A"}</TableCell>
                                        <TableCell>
                                            {new Date(client.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetails(client)}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Ver Detalles
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Client Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <UserPlus className="h-5 w-5 text-blue-600" />
                            </div>
                            {selectedClient?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Detalles del cliente e historial de cotizaciones.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 border-b pb-2">Información de Contacto</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail className="h-4 w-4" />
                                    <span>{selectedClient?.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone className="h-4 w-4" />
                                    <span>{selectedClient?.phone || "No registrado"}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>Registrado el: {selectedClient ? new Date(selectedClient.createdAt).toLocaleDateString() : ""}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 border-b pb-2">Resumen de Actividad</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Cotizaciones</p>
                                    <p className="text-2xl font-bold text-slate-900">{clientQuotes?.length || 0}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Potencial Total</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        US$ {clientQuotes?.reduce((sum, q) => sum + Number(q.totalPrice), 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Historial de Cotizaciones
                        </h3>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Destinos</TableHead>
                                        <TableHead>Vuelos</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clientQuotes && clientQuotes.length > 0 ? (
                                        clientQuotes.map((quote) => (
                                            <TableRow key={quote.id}>
                                                <TableCell className="text-xs">
                                                    {new Date(quote.createdAt).toLocaleDateString("es-CO", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {quote.destinations?.map((d: any, idx) => (
                                                            <Badge key={idx} variant="secondary" className="text-[10px] py-0">
                                                                {d.destination?.name || "Destino"}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {quote.includeFlights ? (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">SÍ</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-400 text-[10px]">NO</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">
                                                    US$ {Number(quote.totalPrice).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-sm italic">
                                                No hay cotizaciones guardadas para este cliente.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
