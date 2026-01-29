import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Users, FileText, UserPlus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase,
  Clock, Activity, BarChart3, LineChart as LineChartIcon
} from "lucide-react";

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

interface AnalyticsSummary {
  totalQuotes: number;
  totalAmountUSD: number;
  totalClients: number;
  totalUsers: number;
  quotesThisMonth: number;
}

interface QuoteTrend {
  date: string;
  count: number;
  amount: number;
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

  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics/summary"],
  });

  const { data: trend } = useQuery<QuoteTrend[]>({
    queryKey: ["/api/admin/analytics/quotes-over-time"],
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
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Bienvenido, {user?.username}. Aquí tienes un resumen del rendimiento de Viaje Rápido.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Cotizaciones</p>
                <h3 className="text-3xl font-bold mt-1">{summary?.totalQuotes || 0}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-100">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{summary?.quotesThisMonth || 0} este mes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Cotizado</p>
                <h3 className="text-3xl font-bold mt-1">
                  US$ {(summary?.totalAmountUSD || 0).toLocaleString()}
                </h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-100">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Crecimiento constante</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm font-medium">Total Clientes</p>
                <h3 className="text-3xl font-bold mt-1">{summary?.totalClients || 0}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-violet-100">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Base de datos activa</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Asesores Activos</p>
                <h3 className="text-3xl font-bold mt-1">{summary?.totalUsers || 0}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-amber-100">
              <Activity className="w-4 h-4 mr-1" />
              <span>Equipo operando</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Volumen de Cotizaciones</CardTitle>
                <CardDescription>Seguimiento de actividad diaria</CardDescription>
              </div>
              <LineChartIcon className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  name="Cotizaciones"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Advisor Stats */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Top Asesores</CardTitle>
                <CardDescription>Rendimiento por usuario</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {stats && stats.length > 0 ? (
              <div className="space-y-6">
                {stats.map((stat, index) => (
                  <div key={stat.userId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {stat.username}
                      </span>
                      <span className="text-slate-500 font-medium">{stat.count}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-emerald-500' :
                            'bg-violet-500'
                          }`}
                        style={{ width: `${(stat.count / Math.max(...stats.map(s => s.count))) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Briefcase className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No hay actividad registrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Quotes */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Cotizaciones Recientes</CardTitle>
            <CardDescription>Últimos movimientos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients?.slice(0, 5).map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] font-bold">CLIENTE</Badge>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4 text-blue-600"
              onClick={() => navigate("/admin/clients")}
            >
              Ver todos los clientes
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Acciones Rápidas</CardTitle>
            <CardDescription>Acceso directo a funciones principales</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
              onClick={() => navigate("/")}
            >
              <FileText className="w-6 h-6" />
              <span>Nueva Cotización</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              onClick={() => navigate("/cotizacion-express")}
            >
              <Activity className="w-6 h-6" />
              <span>Cotización Express</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
              onClick={() => navigate("/admin/clients")}
            >
              <Users className="w-6 h-6" />
              <span>Gestionar Clientes</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-600 hover:border-slate-200 transition-all"
              onClick={handleLogout}
            >
              <LogOut className="w-6 h-6" />
              <span>Cerrar Sesión</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
