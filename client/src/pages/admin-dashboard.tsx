import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, UserPlus, ArrowRight, MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, Legend, ComposedChart
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Briefcase, Activity,
  BarChart3, LineChart as LineChartIcon, MapPinned,
  Zap, Plane, LayoutDashboard, UserPlus as UserPlusIcon, Clock, Mail
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatUSD } from "@shared/schema";
import { motion } from "framer-motion";

interface QuoteStat {
  userId: string;
  username: string;
  count: number;
  amount: number;
}

interface RecentQuote {
  id: string;
  totalPrice: string;
  createdAt: string;
  client: { name: string; email: string };
  user: { username: string };
  destinations: { destination: { name: string } }[];
}

interface AnalyticsSummary {
  totalQuotes: number;
  totalAmountUSD: number;
  totalClients: number;
  totalUsers: number;
  quotesThisMonth: number;
  quotesThisWeek: number;
  totalActivePlans: number;
  savedQuotesCount: number;
  savedQuotesAmount: number;
  ticketPromedio: number;
  newClientsThisMonth: number;
  quotesLastMonth: number;
  quotesLastWeek: number;
  amountThisMonth: number;
  amountThisWeek: number;
  amountLastMonth: number;
  amountLastWeek: number;
}

interface TopDestinationByAmount {
  destinationId: string;
  destinationName: string;
  amount: number;
}

interface QuoteTrend {
  date: string;
  count: number;
  amount: number;
}

interface TopDestination {
  destinationId: string;
  destinationName: string;
  count: number;
}

const CHART_DAYS_OPTIONS = [
  { value: "7", label: "7 días" },
  { value: "14", label: "14 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
];

function VariationBadge({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (pct === 0) return <span className="inline-flex items-center gap-0.5 text-xs opacity-90"><Minus className="w-3 h-3" /> 0%</span>;
  const isPositive = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${isPositive ? "" : ""}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pct > 0 ? "+" : ""}{pct}%{suffix} vs. ant.
    </span>
  );
}

/* Colores fijos para las tarjetas KPI (vibrantes en light y dark) */
const KPI_CARD_GRADIENTS = {
  quotes: "from-[hsl(191,46%,52%)] to-[hsl(191,46%,42%)]",
  amount: "from-[hsl(142,65%,42%)] to-[hsl(142,65%,32%)]",
  clients: "from-[hsl(262,83%,55%)] to-[hsl(262,83%,45%)]",
  advisors: "from-[hsl(38,92%,48%)] to-[hsl(38,92%,38%)]",
} as const;

const KPI_CARDS = [
  {
    key: "quotes",
    label: "Total Cotizaciones",
    sublabel: (s: AnalyticsSummary) => `${s?.quotesThisMonth ?? 0} este mes · ${s?.quotesThisWeek ?? 0} esta semana`,
    value: (s: AnalyticsSummary) => s?.totalQuotes ?? 0,
    variation: (s: AnalyticsSummary) => s ? { current: s.quotesThisMonth, previous: s.quotesLastMonth ?? 0 } : null,
    icon: FileText,
    gradient: KPI_CARD_GRADIENTS.quotes,
  },
  {
    key: "amount",
    label: "Total Cotizado",
    sublabel: (s: AnalyticsSummary) => "Consultas y cotizaciones generadas",
    value: (s: AnalyticsSummary) => `US$ ${(s?.totalAmountUSD || 0).toLocaleString()}`,
    variation: (s: AnalyticsSummary) => s ? { current: s.amountThisMonth ?? 0, previous: s.amountLastMonth ?? 0 } : null,
    icon: DollarSign,
    gradient: KPI_CARD_GRADIENTS.amount,
  },
  {
    key: "clients",
    label: "Clientes",
    sublabel: (s: AnalyticsSummary) => `${s?.totalActivePlans ?? 0} planes activos`,
    value: (s: AnalyticsSummary) => s?.totalClients ?? 0,
    icon: Users,
    gradient: KPI_CARD_GRADIENTS.clients,
    variation: null as null,
  },
  {
    key: "advisors",
    label: "Asesores",
    sublabel: () => "Equipo operando",
    value: (s: AnalyticsSummary) => s?.totalUsers ?? 0,
    icon: Briefcase,
    gradient: KPI_CARD_GRADIENTS.advisors,
    variation: null as null,
  },
];

const QUICK_ACTIONS = [
  { label: "Nueva Cotización", icon: Plane, href: "/", hover: "hover:bg-accent hover:text-primary hover:border-primary/20" },
  { label: "Express", icon: Zap, href: "/cotizacion-express", hover: "hover:bg-accent hover:text-chart-3 hover:border-chart-3/20" },
  { label: "Clientes", icon: Users, href: "/admin/clients", hover: "hover:bg-accent hover:text-chart-2 hover:border-chart-2/20" },
  { label: "Admin Planes", icon: MapPin, href: "/admin/plans", hover: "hover:bg-accent hover:text-chart-4 hover:border-chart-4/20" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isTestEmailOpen, setIsTestEmailOpen] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [chartDays, setChartDays] = useState("30");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<QuoteStat[]>({
    queryKey: ["/api/admin/quotes/stats"],
  });

  const { data: recentQuotes, isLoading: recentLoading } = useQuery<RecentQuote[]>({
    queryKey: ["/api/admin/quotes/recent?limit=8"],
  });

  const { data: summary, isLoading: summaryLoading, dataUpdatedAt } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics/summary"],
  });

  const { data: trend, isLoading: trendLoading } = useQuery<QuoteTrend[]>({
    queryKey: [`/api/admin/analytics/quotes-over-time?days=${chartDays}`],
  });

  const { data: topDestinations, isLoading: topDestLoading } = useQuery<TopDestination[]>({
    queryKey: ["/api/admin/analytics/top-destinations?limit=8"],
  });

  const { data: topDestinationsByAmount, isLoading: topDestByAmountLoading } = useQuery<TopDestinationByAmount[]>({
    queryKey: ["/api/admin/analytics/top-destinations-by-amount?limit=8"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string }) => {
      const response = await apiRequest("POST", "/api/admin/clients", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/summary"] });
      toast({ title: "Cliente creado", description: "El cliente se ha creado exitosamente" });
      setIsClientDialogOpen(false);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
    },
    onError: (error: Error) => {
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

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestEmailLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/test-email", { to: testEmailTo });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Correo enviado", description: `Revisa ${testEmailTo} (y spam)` });
        setIsTestEmailOpen(false);
      } else {
        toast({ title: "Error", description: data.message || "Revisa logs en Railway", variant: "destructive" });
      }
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  };

  // Normalizar ambas series a 0-100 para que sean visibles en el mismo gráfico
  const chartData = (() => {
    const raw = (trend || []).map((t) => ({
      ...t,
      dateLabel: formatChartDate(t.date),
    }));
    if (raw.length === 0) return raw;
    const maxCount = Math.max(...raw.map((d) => d.count), 1);
    const maxAmount = Math.max(...raw.map((d) => d.amount), 1);
    return raw.map((d) => ({
      ...d,
      countNorm: Math.round((d.count / maxCount) * 100),
      amountNorm: Math.round((d.amount / maxAmount) * 100),
    }));
  })();

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Header — Responsive */}
      <header className="mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel de control</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Hola, <span className="font-medium text-foreground">{(user?.name && user.name.trim()) || user?.username}</span>. Resumen del rendimiento del negocio.
            </p>
          </div>
          <div className="hidden sm:flex sm:flex-col sm:items-end gap-1 text-sm text-muted-foreground">
            <span>{new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            {dataUpdatedAt > 0 && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Actualizado {new Date(dataUpdatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </motion.div>
      </header>

      {/* KPI Cards — Grid responsivo: 1 col móvil, 2 tablet, 4 desktop */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 md:mb-8"
      >
        {KPI_CARDS.map((kpi, i) => (
          <motion.div key={kpi.key} variants={item}>
            <Card className={`border-none shadow-sm overflow-hidden bg-gradient-to-br ${kpi.gradient} text-white h-full min-h-[120px] sm:min-h-[128px]`}>
              <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white/90 text-xs sm:text-sm font-medium truncate">{kpi.label}</p>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 tracking-tight truncate">
                      {summaryLoading ? (
                        <Skeleton className="h-8 w-20 sm:h-9 bg-white/30" />
                      ) : (
                        kpi.value(summary!)
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 p-2 sm:p-2.5 rounded-lg bg-white/20">
                    <kpi.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-white/90 text-xs sm:text-sm">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden />
                  <span className="truncate">{kpi.sublabel(summary!)}</span>
                  {typeof kpi.variation === "function" && (() => {
                    const v = kpi.variation(summary!);
                    return v && v.previous > 0 ? (
                      <VariationBadge current={v.current} previous={v.previous} />
                    ) : null;
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* Métricas secundarias — Ticket promedio, Guardadas, Clientes nuevos */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 md:mb-8"
      >
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <DollarSign className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ticket promedio</p>
              <div className="text-lg font-bold text-foreground">
                {summaryLoading ? <Skeleton className="h-6 w-20" /> : `US$ ${formatUSD(String(summary?.ticketPromedio ?? 0))}`}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-chart-3/15">
              <FileText className="w-5 h-5 text-chart-3" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Cotizaciones guardadas</p>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24 mt-0.5" />
              ) : (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  <span className="text-xl font-bold text-foreground">
                    US$ {formatUSD(String(summary?.savedQuotesAmount ?? 0))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {summary?.savedQuotesCount ?? 0} {((summary?.savedQuotesCount ?? 0) === 1) ? "cotización" : "cotizaciones"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-chart-2/15">
              <UserPlusIcon className="w-5 h-5 text-chart-2" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Clientes nuevos este mes</p>
              <div className="text-lg font-bold text-foreground">
                {summaryLoading ? <Skeleton className="h-6 w-8" /> : summary?.newClientsThisMonth ?? 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Gráfico + Top Asesores — Responsive layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="pb-2 sm:pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Volumen y Montos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Cotizaciones y valor por día (escala relativa para comparación)</CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={chartDays} onValueChange={setChartDays}>
                    <SelectTrigger className="w-full sm:w-[130px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_DAYS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <LineChartIcon className="w-5 h-5 text-muted-foreground hidden sm:block" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[280px] sm:h-[320px] lg:h-[350px] -mt-2">
              {trendLoading ? (
                <Skeleton className="w-full h-full rounded-lg" />
              ) : chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mb-2 opacity-50" aria-hidden />
                  <p className="text-sm">No hay datos en este período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={10} />
                    <YAxis domain={[0, 105]} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={(_, name: string, item: { payload?: Record<string, unknown> }) => {
                        const p = item?.payload as { count?: number; amount?: number; countNorm?: number; amountNorm?: number } | undefined;
                        if (!p) return [_, name];
                        if (name === "Cotizaciones") return [String(p.count ?? p.countNorm ?? _), name];
                        return [formatUSD(String(p.amount ?? p.amountNorm ?? _)), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="countNorm"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      fill="url(#colorCount)"
                      name="Cotizaciones"
                    />
                    <Area
                      type="monotone"
                      dataKey="amountNorm"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      fill="url(#colorAmount)"
                      name="Monto USD"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Asesores */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass" className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg font-bold">Top Asesores</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Cotizaciones y monto total</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {statsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : stats && stats.length > 0 ? (
                <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[280px]">
                  <div className="space-y-5 pr-4">
                    {stats.map((stat, index) => (
                      <div key={stat.userId} className="space-y-2">
                        <div className="flex justify-between text-sm gap-2">
                          <span className="font-semibold text-foreground truncate">{stat.username}</span>
                          <span className="text-muted-foreground font-medium shrink-0 text-xs sm:text-sm">{stat.count} cot. · {formatUSD(stat.amount)}</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              index === 0 ? "bg-primary" : index === 1 ? "bg-chart-3" : "bg-chart-2"
                            }`}
                            style={{
                              width: `${(stat.count / Math.max(...stats.map((s) => s.count), 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Briefcase className="w-8 h-8 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-sm text-muted-foreground">No hay actividad registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Cotizaciones recientes + Destinos + Acciones — Grid responsivo */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Cotizaciones Recientes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card variant="glass" className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Cotizaciones Recientes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Últimas cotizaciones guardadas</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary shrink-0 -mr-2 lg:hidden"
                  onClick={() => navigate("/admin/clients")}
                >
                  Ver
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {recentLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentQuotes && recentQuotes.length > 0 ? (
                <>
                  <ScrollArea className="h-[240px] sm:h-[280px] lg:h-[300px] -mx-1 px-1">
                    <div className="space-y-1">
                      {recentQuotes.map((quote) => (
                        <button
                          key={quote.id}
                          onClick={() => navigate(`/advisor/quotes/${quote.id}`)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border border-transparent hover:border-border text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="bg-primary/10 p-2 rounded-full shrink-0">
                              <FileText className="w-4 h-4 text-primary" aria-hidden />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{quote.client.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {quote.destinations?.map((d) => d.destination?.name).filter(Boolean).join(", ") || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatUSD(quote.totalPrice)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(quote.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-1" aria-hidden />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    variant="ghost"
                    className="w-full mt-3 text-primary hover:bg-accent"
                    onClick={() => navigate("/admin/clients")}
                  >
                    Ver clientes
                    <ArrowRight className="w-4 h-4 ml-1" aria-hidden />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">No hay cotizaciones guardadas</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/")}>
                    Crear cotización
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Destinos — Por cantidad o por monto */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="glass" className="h-full flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg font-bold">Destinos destacados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Por cantidad o por monto generado</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="count" className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="count" className="text-xs sm:text-sm">Por cantidad</TabsTrigger>
                  <TabsTrigger value="amount" className="text-xs sm:text-sm">Por monto</TabsTrigger>
                </TabsList>
                <TabsContent value="count" className="mt-0 flex-1 min-h-0">
                  {topDestLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-8 w-full rounded" />
                      ))}
                    </div>
                  ) : topDestinations && topDestinations.length > 0 ? (
                    <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[280px]">
                      <div className="space-y-3 pr-4">
                        {topDestinations.map((d, i) => (
                          <div key={d.destinationId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">{i + 1}.</span>
                              <p className="text-sm font-medium truncate">{d.destinationName}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">{d.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MapPinned className="w-10 h-10 text-muted-foreground mb-2" aria-hidden />
                      <p className="text-sm text-muted-foreground">Sin datos aún</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="amount" className="mt-0 flex-1 min-h-0">
                  {topDestByAmountLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-8 w-full rounded" />
                      ))}
                    </div>
                  ) : topDestinationsByAmount && topDestinationsByAmount.length > 0 ? (
                    <ScrollArea className="h-[200px] sm:h-auto sm:max-h-[280px]">
                      <div className="space-y-3 pr-4">
                        {topDestinationsByAmount.map((d, i) => (
                          <div key={d.destinationId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">{i + 1}.</span>
                              <p className="text-sm font-medium truncate">{d.destinationName}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 font-mono">{formatUSD(String(d.amount))}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MapPinned className="w-10 h-10 text-muted-foreground mb-2" aria-hidden />
                      <p className="text-sm text-muted-foreground">Sin datos aún</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Acciones Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card variant="glass" className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg font-bold">Acciones Rápidas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Acceso directo a funciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className={`h-20 sm:h-24 flex flex-col items-center justify-center gap-2 transition-all ${action.hover}`}
                    onClick={() => navigate(action.href)}
                  >
                    <action.icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                    <span className="text-xs sm:text-sm font-medium">{action.label}</span>
                  </Button>
                ))}
                <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-chart-1 hover:border-chart-1/20 transition-all"
                    >
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                      <span className="text-xs sm:text-sm font-medium">Probar correo</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Probar Brevo SMTP</DialogTitle>
                      <DialogDescription>Envía un correo de prueba para verificar que 2FA y notificaciones funcionen.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTestEmail} className="space-y-4">
                      <div>
                        <Label htmlFor="test-email">Email destino</Label>
                        <Input
                          id="test-email"
                          type="email"
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          placeholder="tu@correo.com"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={testEmailLoading}>
                        {testEmailLoading ? "Enviando…" : "Enviar correo de prueba"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent transition-all col-span-2"
                    >
                      <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                      <span className="text-xs sm:text-sm font-medium">Nuevo Cliente</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nuevo Cliente</DialogTitle>
                      <DialogDescription>Crea un cliente en la base de datos para asignarlo a cotizaciones.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateClient} className="space-y-4">
                      <div>
                        <Label htmlFor="client-name">Nombre</Label>
                        <Input
                          id="client-name"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Nombre completo"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-email">Email</Label>
                        <Input
                          id="client-email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="email@ejemplo.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="client-phone">Teléfono (opcional)</Label>
                        <Input
                          id="client-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="+57 300 123 4567"
                        />
                      </div>
                      <Button type="submit" disabled={createClientMutation.isPending}>
                        {createClientMutation.isPending ? "Creando..." : "Crear Cliente"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
