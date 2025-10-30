import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import QuoteSummary from "@/pages/quote-summary";
import Dashboard from "@/pages/dashboard";
import Quotes from "@/pages/quotes";
import QuoteEditor from "@/pages/quote-editor";
import Destinations from "@/pages/destinations";
import DestinationEditor from "@/pages/destination-editor";
import Clients from "@/pages/clients";
import ClientEditor from "@/pages/client-editor";
import AdminTools from "@/pages/admin-tools";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/" component={Home} />
      <Route path="/cotizacion" component={QuoteSummary} />
      
      {isAuthenticated && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/quotes" component={Quotes} />
          <Route path="/quotes/new" component={QuoteEditor} />
          <Route path="/quotes/:id" component={QuoteEditor} />
          <Route path="/clients" component={Clients} />
          <Route path="/clients/new" component={ClientEditor} />
          <Route path="/clients/:id" component={ClientEditor} />
          <Route path="/destinations" component={Destinations} />
          <Route path="/destinations/new" component={DestinationEditor} />
          <Route path="/destinations/:id" component={DestinationEditor} />
          <Route path="/admin-tools" component={AdminTools} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isPublicRoute = location === "/" || location === "/cotizacion" || location === "/login" || location === "/register";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || isPublicRoute) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-serif font-bold text-foreground">Sistema de Cotización</h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
