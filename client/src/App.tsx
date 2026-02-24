import { lazy, Suspense } from "react";
import { Router, Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard-layout";

const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdvisorDashboard = lazy(() => import("@/pages/advisor-dashboard"));
const QuoteDetail = lazy(() => import("@/pages/quote-detail"));
const QuoteEdit = lazy(() => import("@/pages/quote-edit"));
const Home = lazy(() => import("@/pages/home"));
const QuoteSummary = lazy(() => import("@/pages/quote-summary"));
const QuoteExpress = lazy(() => import("@/pages/quote-express"));
const Clients = lazy(() => import("@/pages/clients"));
const AdminPlans = lazy(() => import("@/pages/admin-plans"));
const AdminPlanForm = lazy(() => import("@/pages/admin-plan-form"));
const AdminUsers = lazy(() => import("@/pages/admin-users"));

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

  return (
    <DashboardLayout>
      <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>}>
        <Component />
      </Suspense>
    </DashboardLayout>
  );
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
    return <Redirect to="/admin/dashboard" />;
  } else if (user.role === "advisor") {
    return <Redirect to="/advisor" />;
  }

  return <Redirect to="/login" />;
}

function AppRoutes() {
  return (
    <Router>
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Cargando...</p></div>}>
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/admin" component={DashboardRedirect} />
      <Route path="/admin/clients">
        <ProtectedRoute component={Clients} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute component={AdminUsers} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedRoute component={AdminDashboard} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/plans/new">
        <ProtectedRoute component={AdminPlanForm} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/plans/:id/edit">
        <ProtectedRoute component={AdminPlanForm} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/plans">
        <ProtectedRoute component={AdminPlans} allowedRoles={["super_admin"]} />
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
      <Route path="/cotizacion-express">
        <ProtectedRoute component={QuoteExpress} allowedRoles={["super_admin", "advisor"]} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={Home} allowedRoles={["super_admin", "advisor"]} />
      </Route>
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
