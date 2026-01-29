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
                <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/50">
                    <header className="bg-white shadow-md border-b sticky top-0 z-10 hidden md:block">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="h-7 w-7" />
                                {isQuoteExpress ? (
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight">
                                        Cotización <span className="text-blue-400 font-light">Express</span>
                                    </h1>
                                ) : (
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-blue-600 tracking-tight">
                                        Cosmos <span className="text-blue-400 font-light">Mayorista</span>
                                    </h1>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Mobile Header (simplified) */}
                    <div className="md:hidden sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur">
                        <SidebarTrigger className="mr-2" />
                        <div className="flex-1">
                            {isQuoteExpress ? (
                                <h2 className="text-lg font-semibold tracking-tight text-blue-600">Cotización Express</h2>
                            ) : (
                                <h2 className="text-lg font-semibold tracking-tight text-blue-600">Cosmos Mayorista</h2>
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
