import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Redirect, useLocation } from "wouter";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return <Redirect to="/login" />;
    }

    const isQuoteExpress = location === "/cotizacion-express";
    const isFullWidthPage = location === "/" || location === "/cotizacion" || location === "/cotizacion-express";

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <AppSidebar />
                <main className="flex-1 overflow-auto">
                    <header className="header-glass header-warm sticky top-0 z-10 hidden md:block overflow-hidden">
                        <div className="container mx-auto px-6 py-4 relative">
                            <div className="flex items-center gap-3">
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
                        </div>
                    </header>

                    {/* Mobile Header */}
                    <div className="md:hidden sticky top-0 z-10 flex h-14 items-center header-glass header-warm px-4 overflow-hidden">
                        <SidebarTrigger className="mr-3 h-8 w-8 rounded-lg shrink-0" />
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
                    </div>

                    <div className={isFullWidthPage ? "p-0" : "p-4 md:p-8"}>
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
