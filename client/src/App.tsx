import { lazy, Suspense } from "react";
import { Router, Switch, Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { QUOTE_USER_ROLES } from "@shared/roles";
import { canAccessMilesCalculator, canAccessModule, USER_MODULES, type UserModuleId } from "@shared/modules";
import { getPostLoginPath } from "@/lib/authUtils";

const PUBLIC_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/index.html",
]);

function isPublicPath(path: string) {
  const bare = path.split("?")[0].replace(/\/$/, "") || "/";
  return PUBLIC_PATHS.has(bare);
}

function SessionLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" aria-label="Verificando sesión">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Esqueleto del contenido. El marco (sidebar, header) sigue montado. */
function PageSkeleton() {
  return (
    <div className="page-enter space-y-4" aria-label="Cargando sección">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-xl" />
        ))}
      </div>
    </div>
  );
}

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
const PlanDetail = lazy(() => import("@/pages/plan-detail"));
const QuoteSummary = lazy(() => import("@/pages/quote-summary"));
const QuoteExpress = lazy(() => import("@/pages/quote-express"));
const Clients = lazy(() => import("@/pages/clients"));
const AdminPlans = lazy(() => import("@/pages/admin-plans"));
const AdminPlanForm = lazy(() => import("@/pages/admin-plan-form"));
const AdminUsers = lazy(() => import("@/pages/admin-users"));
const Tutoriales = lazy(() => import("@/pages/tutoriales"));
const AdminTutorials = lazy(() => import("@/pages/admin-tutorials"));
const AdminTutorialCourseForm = lazy(() => import("@/pages/admin-tutorial-course-form"));
const AdminTutorialsMetricas = lazy(() => import("@/pages/admin-tutorials-metricas"));
const AdminCosmosConfig = lazy(() => import("@/pages/admin-cosmos-config"));
const ToolsDayCounter = lazy(() => import("@/pages/tools-day-counter"));
const ToolsMilesCalculator = lazy(() => import("@/pages/tools-miles-calculator"));
const DashboardLayout = lazy(() =>
  import("@/components/dashboard-layout").then((m) => ({ default: m.DashboardLayout })),
);

function GuardedPage({
  component: Component,
  allowedRoles,
  requiredModule,
  requireMilesAccess,
}: {
  component: React.ComponentType;
  allowedRoles?: string[];
  requiredModule?: UserModuleId;
  requireMilesAccess?: boolean;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={getPostLoginPath(user.role)} />;
  }

  if (requiredModule && !canAccessModule(user, requiredModule)) {
    return <Redirect to={getPostLoginPath(user.role)} />;
  }

  if (requireMilesAccess && !canAccessMilesCalculator(user)) {
    return <Redirect to={getPostLoginPath(user.role)} />;
  }

  return <Component />;
}

function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "super_admin") {
    return <Redirect to="/admin/dashboard" />;
  }
  if (user.role === "agency") {
    return <Redirect to="/advisor" />;
  }
  if (user.role === "provider") {
    return <Redirect to="/admin/plans" />;
  }

  return <Redirect to="/login" />;
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (!user) return <Redirect to="/login" />;

  return (
    <Suspense fallback={<SessionLoading />}>
      <DashboardLayout>
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            <Route path="/admin" component={DashboardRedirect} />
            <Route path="/mis-clientes">
              <GuardedPage component={Clients} allowedRoles={[...QUOTE_USER_ROLES]} />
            </Route>
      <Route path="/admin/clients">
        <GuardedPage component={Clients} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/users">
        <GuardedPage component={AdminUsers} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/dashboard">
        <GuardedPage component={AdminDashboard} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/plans/new">
        <GuardedPage component={AdminPlanForm} allowedRoles={["super_admin", "provider"]} />
      </Route>
      <Route path="/admin/plans/:id/edit">
        <GuardedPage component={AdminPlanForm} allowedRoles={["super_admin", "provider"]} />
      </Route>
      <Route path="/admin/plans">
        <GuardedPage component={AdminPlans} allowedRoles={["super_admin", "provider"]} />
      </Route>
      <Route path="/admin/tutoriales/metricas">
        <GuardedPage component={AdminTutorialsMetricas} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/tutoriales/curso/:id">
        <GuardedPage component={AdminTutorialCourseForm} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/tutoriales">
        <GuardedPage component={AdminTutorials} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/admin/cosmos">
        <GuardedPage component={AdminCosmosConfig} allowedRoles={["super_admin"]} />
      </Route>
      <Route path="/tutoriales/curso/:courseId/leccion/:lessonId">
        <GuardedPage component={Tutoriales} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.ACADEMY} />
      </Route>
      <Route path="/tutoriales/curso/:courseId">
        <GuardedPage component={Tutoriales} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.ACADEMY} />
      </Route>
      <Route path="/tutoriales">
        <GuardedPage component={Tutoriales} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.ACADEMY} />
      </Route>
      <Route path="/advisor/quotes/:id/edit">
        <GuardedPage component={QuoteEdit} allowedRoles={[...QUOTE_USER_ROLES]} />
      </Route>
      <Route path="/advisor/quotes/:id">
        <GuardedPage component={QuoteDetail} allowedRoles={[...QUOTE_USER_ROLES]} />
      </Route>
      <Route path="/advisor">
        <GuardedPage component={AdvisorDashboard} allowedRoles={[...QUOTE_USER_ROLES]} />
      </Route>
      <Route path="/cotizacion">
        <GuardedPage component={QuoteSummary} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.QUOTE} />
      </Route>
      <Route path="/cotizacion-express">
        <GuardedPage component={QuoteExpress} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.QUOTE_EXPRESS} />
      </Route>
      <Route path="/herramientas/contador-dias">
        <GuardedPage component={ToolsDayCounter} allowedRoles={[...QUOTE_USER_ROLES]} requiredModule={USER_MODULES.DAY_COUNTER} />
      </Route>
      <Route path="/herramientas/cotizador-millas">
        <GuardedPage component={ToolsMilesCalculator} allowedRoles={[...QUOTE_USER_ROLES]} requireMilesAccess />
      </Route>
      <Route path="/plan/:id">
        <GuardedPage component={PlanDetail} allowedRoles={["super_admin", "agency", "provider"]} requiredModule={USER_MODULES.QUOTE} />
      </Route>
      <Route path="/">
        <GuardedPage component={Home} allowedRoles={["super_admin", "agency", "provider"]} requiredModule={USER_MODULES.QUOTE} />
      </Route>
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </DashboardLayout>
    </Suspense>
  );
}

function PublicRoutes() {
  return (
    <Suspense fallback={<SessionLoading />}>
      <Switch>
        <Route path="/index.html">
          <Redirect to="/" />
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Router>
      <LocationSwitch />
    </Router>
  );
}

function LocationSwitch() {
  const [location] = useLocation();
  if (isPublicPath(location)) return <PublicRoutes />;
  return <AuthenticatedApp />;
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
