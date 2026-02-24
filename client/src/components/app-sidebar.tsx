import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarCollapseArrow,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { FileText, Users, BarChart3, LogOut, Plane, Zap, MapPin, Camera, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { AvatarCropInline } from "@/components/avatar-crop-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null, username?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (username) return username.slice(0, 2).toUpperCase();
  return "?";
}

function ProfileSection({
  user,
  onLogout,
  updateProfile,
}: {
  user: { name?: string | null; username: string; avatarUrl?: string | null } | null;
  onLogout: () => void;
  updateProfile: (data: { name?: string; avatarUrl?: string | null }) => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = (user?.name && user.name.trim()) || user?.username || "Usuario";

  useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: name.trim() || undefined });
      toast({ title: "Perfil actualizado", description: "Tu perfil se ha guardado correctamente." });
      setOpen(false);
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast({ title: "Archivo no válido", description: "Usa JPEG, PNG, GIF o WebP. Máximo 10MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "La imagen debe pesar menos de 10MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("avatar", "true");
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      const text = await res.text();
      let data: { url?: string; message?: string } = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Respuesta inválida del servidor");
      }
      if (!res.ok) throw new Error(data.message || `Error ${res.status}: ${text.slice(0, 100)}`);
      if (!data.url) throw new Error("El servidor no devolvió la URL de la imagen");
      await updateProfile({ avatarUrl: data.url });
      toast({ title: "Foto actualizada", description: "Tu foto de perfil se ha actualizado." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir la imagen. Verifica la conexión.";
      toast({ title: "Error al subir", description: msg, variant: "destructive" });
      throw err;
    } finally {
      setUploading(false);
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
      }
    }
  };

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="flex w-full items-center gap-3 rounded-xl p-2.5 hover:bg-sidebar-accent/80 transition-colors duration-200 text-left group/profile group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-start"
            onClick={() => setName(user?.name ?? "")}
            title={isCollapsed ? displayName : undefined}
          >
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-sidebar-border/50 group-hover/profile:ring-sidebar-primary/30 transition-shadow group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                {getInitials(user?.name, user?.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{displayName}</p>
              <p className="text-[11px] text-muted-foreground/80 truncate">{user?.username}</p>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={cropImageSrc ? (e) => e.preventDefault() : undefined}
        >
          {cropImageSrc ? (
            <AvatarCropInline
              imageSrc={cropImageSrc}
              onComplete={handleCropComplete}
              onCancel={() => {
                URL.revokeObjectURL(cropImageSrc);
                setCropImageSrc(null);
              }}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Mi perfil</DialogTitle>
                <DialogDescription>
                  Actualiza tu nombre y foto de perfil. La foto se mostrará en el menú lateral.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group"
                    disabled={uploading}
                  >
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={user?.avatarUrl ?? undefined} alt={displayName} />
                      <AvatarFallback className="bg-primary/15 text-primary text-2xl">
                        {getInitials(user?.name, user?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground">Clic para cambiar foto</p>
                  {user?.avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={async () => {
                        try {
                          await updateProfile({ avatarUrl: null });
                          toast({ title: "Foto eliminada", description: "Se ha quitado tu foto de perfil." });
                        } catch {
                          toast({ title: "Error", description: "No se pudo quitar la foto.", variant: "destructive" });
                        }
                      }}
                    >
                      Quitar foto
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nombre</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveProfile}>Guardar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start rounded-lg px-3 py-2 h-auto text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
        onClick={onLogout}
        data-testid="button-sidebar-logout"
      >
        <LogOut className="h-4 w-4 mr-2.5 opacity-70" />
        Cerrar Sesión
      </Button>
    </>
  );
}

export function AppSidebar() {
  const { user, logout, updateProfile } = useAuth();
  const [location, navigate] = useLocation();
  const { state, isMobile } = useSidebar();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "super_admin";

  const adminSection = {
    label: "Administración",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: BarChart3 },
      { title: "Admin Planes", url: "/admin/plans", icon: MapPin },
      { title: "Clientes", url: "/admin/clients", icon: Users },
      { title: "Usuarios", url: "/admin/users", icon: UserCog },
    ],
  };

  const cotizacionesItems = [
    { title: "Nueva Cotización", url: "/", icon: Plane },
    { title: "Cotización Express", url: "/cotizacion-express", icon: Zap },
  ];

  const advisorSection = {
    label: "Cotizaciones",
    items: [...cotizacionesItems, { title: "Mis Cotizaciones", url: "/advisor", icon: FileText }],
  };

  const adminCotizacionesSection = {
    label: "Cotizaciones",
    items: cotizacionesItems,
  };

  const sections = isAdmin
    ? [adminSection, adminCotizacionesSection]
    : [{ label: "Navegación", items: advisorSection.items }];

  const renderMenuItems = (items: typeof advisorSection.items) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={location === item.url}
          tooltip={item.title}
          data-testid={`sidebar-${item.title.toLowerCase().replace(/ /g, "-")}`}
          className="rounded-lg px-3 py-2.5 text-[13px] data-[active=true]:font-medium [&>svg]:opacity-70 [&>svg]:size-[18px] [&>svg]:shrink-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"
        >
          <Link href={item.url} className="flex items-center gap-3 [&>svg]:transition-all [&>svg]:duration-300 group-data-[collapsible=icon]:gap-0">
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar className={cn("sidebar-modern", state === "collapsed" && "sidebar-collapsed")} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 px-5 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:grid group-data-[collapsible=icon]:grid-cols-[1fr_auto] group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:relative">
        <div className="flex items-center gap-3 min-w-0 flex-1 group-data-[collapsible=icon]:relative group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(191,46%,55%)] text-white font-semibold text-[15px] shadow-lg shadow-primary/30 ring-2 ring-white/20 group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:top-1/2 group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:-translate-y-1/2 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:text-[13px]">
            C
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
              Cosmos Mayorista
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {isAdmin ? "Administrador" : "Asesor"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end">
          <SidebarCollapseArrow className="text-sidebar-foreground hover:text-sidebar-primary" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
            <SidebarGroupLabel className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
              <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col">
                {renderMenuItems(section.items)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/60 px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <div className="space-y-3 group-data-[collapsible=icon]:space-y-2">
          <ThemeToggle collapsed={state === "collapsed" && !isMobile} />
          <ProfileSection user={user} onLogout={handleLogout} updateProfile={updateProfile} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
