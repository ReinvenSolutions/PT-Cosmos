import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminDashboard from "@/pages/admin-dashboard";
import AdvisorDashboard from "@/pages/advisor-dashboard";
import QuoteDetail from "@/pages/quote-detail";
import QuoteEdit from "@/pages/quote-edit";
import Home from "@/pages/home";
import QuoteSummary from "@/pages/quote-summary";

function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: React.ComponentType; 
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function DashboardRedirect() {
  const { user, isLoading } = useAuth();

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

  if (user.role === "super_admin") {
    return <Redirect to="/admin" />;
  } else if (user.role === "advisor") {
    return <Redirect to="/advisor" />;
  }

  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={DashboardRedirect} />
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/advisor/quotes/:id/edit">
        <ProtectedRoute component={QuoteEdit} allowedRoles={["advisor", "super_admin"]} />
      </Route>
      <Route path="/advisor/quotes/:id">
        <ProtectedRoute component={QuoteDetail} allowedRoles={["advisor", "super_admin"]} />
      </Route>
      <Route path="/advisor">
        <ProtectedRoute component={AdvisorDashboard} allowedRoles={["advisor", "super_admin"]} />
      </Route>
      <Route path="/cotizacion">
        <ProtectedRoute component={QuoteSummary} allowedRoles={["super_admin", "advisor"]} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Home} allowedRoles={["super_admin", "advisor"]} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
