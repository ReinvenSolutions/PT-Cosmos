import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CosmosFooter } from "@/components/cosmos-footer";
import { CosmosChatWidget } from "@/components/cosmos-chat-widget";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TRM_EFFECTIVE_SURCHARGE_COP } from "@shared/trm";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

function HeaderTrmBadge() {
    const { data, isLoading } = useQuery<{
        baseTrm: number | null;
        effectiveTrm: number | null;
        surchargeCop: number;
    }>({
        queryKey: ["/api/settings/global-trm"],
    });

    const effective = data?.effectiveTrm;
    const base = data?.baseTrm;
    const delta = data?.surchargeCop ?? TRM_EFFECTIVE_SURCHARGE_COP;

    if (isLoading) {
        return (
            <div className="text-right text-xs md:text-sm text-muted-foreground shrink-0 tabular-nums">
                TRM…
            </div>
        );
    }

    if (effective == null || base == null) {
        return (
            <div className="text-right text-xs md:text-sm text-muted-foreground max-w-[200px] md:max-w-none shrink-0">
                <span className="font-medium text-foreground/80">TRM cotizador</span>
                <div className="tabular-nums">Sin configurar</div>
            </div>
        );
    }

    return (
        <div className="text-right text-xs md:text-sm shrink-0" title={`Base ${base.toLocaleString("es-CO")} + ${delta} COP`}>
            <div className="text-muted-foreground font-medium">TRM aplicable</div>
            <div className="font-bold tabular-nums text-foreground">
                $ {effective.toLocaleString("es-CO", { maximumFractionDigits: 0 })}{" "}
                <span className="font-normal text-muted-foreground">COP/USD</span>
            </div>
        </div>
    );
}

/** Solo se usa dentro de ProtectedRoute, que ya verificó auth. */
export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [location] = useLocation();

    const isQuoteExpress = location === "/cotizacion-express";
    const isFullWidthPage =
      location === "/" ||
      location === "/cotizacion" ||
      location === "/cotizacion-express" ||
      location.startsWith("/tutoriales") ||
      location.startsWith("/herramientas");

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex flex-1 flex-col min-h-0 overflow-auto">
                    <header className="header-glass header-warm sticky top-0 z-10 hidden md:block overflow-hidden">
                        <div className="container mx-auto px-6 py-4 relative">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                {isQuoteExpress ? (
                                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                                        <span className="bg-gradient-to-r from-primary via-primary to-[hsl(191,46%,55%)] bg-clip-text text-transparent">Cotización</span>
                                        <span className="font-medium text-muted-foreground ml-1.5">Express</span>
                                    </h1>
                                ) : (
                                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                                        <span className="bg-gradient-to-r from-primary via-primary to-[hsl(191,46%,55%)] bg-clip-text text-transparent">Cosmos</span>
                                        <span className="font-medium text-muted-foreground ml-1.5">Mayorista</span>
                                    </h1>
                                )}
                                </div>
                                <HeaderTrmBadge />
                            </div>
                        </div>
                    </header>

                    {/* Mobile Header */}
                    <div className="md:hidden sticky top-0 z-10 flex h-14 items-center header-glass header-warm px-4 overflow-hidden gap-2">
                        <SidebarTrigger className="mr-1 h-8 w-8 rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                            {isQuoteExpress ? (
                                <h2 className="text-base font-bold tracking-tight">
                                    <span className="bg-gradient-to-r from-primary to-[hsl(191,46%,55%)] bg-clip-text text-transparent">Cotización</span>
                                    <span className="font-medium text-muted-foreground"> Express</span>
                                </h2>
                            ) : (
                                <h2 className="text-base font-bold tracking-tight">
                                    <span className="bg-gradient-to-r from-primary to-[hsl(191,46%,55%)] bg-clip-text text-transparent">Cosmos</span>
                                    <span className="font-medium text-muted-foreground"> Mayorista</span>
                                </h2>
                            )}
                        </div>
                        <HeaderTrmBadge />
                    </div>

                    <div className={`flex-1 min-h-0 ${isFullWidthPage ? "p-0" : "p-4 md:p-8"}`}>
                        {children}
                    </div>
                    <CosmosFooter />
                </main>
            </div>
            <CosmosChatWidget />
        </SidebarProvider>
    );
}
