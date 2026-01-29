import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, FileText, Users, BarChart3, LogOut, Plane, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const advisorMenuItems = [
    {
      title: "Nueva Cotización",
      url: "/",
      icon: Plane,
    },
    {
      title: "Cotización Express",
      url: "/cotizacion-express",
      icon: Zap,
    },
    {
      title: "Mis Cotizaciones",
      url: "/advisor",
      icon: FileText,
    },
  ];

  const adminMenuItems = [
    {
      title: "Dashboard",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Clientes",
      url: "/admin/clients",
      icon: Users,
    },
    {
      title: "Nueva Cotización",
      url: "/",
      icon: Plane,
    },
    {
      title: "Cotización Express",
      url: "/cotizacion-express",
      icon: Zap,
    },
  ];

  const menuItems = user?.role === "super_admin" ? adminMenuItems : advisorMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Cosmos Mayorista</span>
            <span className="text-xs text-muted-foreground">
              {user?.role === "super_admin" ? "Administrador" : "Asesor"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-${item.title.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {user?.username}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
            data-testid="button-sidebar-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
