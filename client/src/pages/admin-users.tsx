import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  UserPlus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Shield,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "super_admin", label: "Super Admin", icon: Shield },
  { value: "advisor", label: "Asesor", icon: UserCog },
] as const;

const CONFIRM_WORDS = [
  "ELIMINAR", "BORRAR", "CONFIRMAR", "PERMANENTE", "ADIOS", "DESTRUIR",
  "FINAL", "TERMINAR", "SUPRIMIR", "CANCELAR", "QUITAR", "QUEMAR",
  "TURBINA", "MARIPOSA", "DINAMO", "PIZARRA", "VOLCAN", "RASCACIELOS"
];

function generateRandomWord(): string {
  return CONFIRM_WORDS[Math.floor(Math.random() * CONFIRM_WORDS.length)];
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [confirmWord, setConfirmWord] = useState("");
  const [randomWord, setRandomWord] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; username: string; email?: string; password: string; role: string }) =>
      apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateOpen(false);
      toast({ title: "Usuario creado", description: "El usuario se ha creado correctamente." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUser(null);
      toast({ title: "Usuario actualizado", description: "Los cambios se han guardado." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/active`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Estado actualizado", description: "El estado del usuario ha sido modificado." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteUser(null);
      setConfirmWord("");
      toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenDelete = (user: AdminUser) => {
    setDeleteUser(user);
    setConfirmWord("");
    setRandomWord(generateRandomWord());
  };

  const handleConfirmDelete = () => {
    if (!deleteUser || confirmWord !== randomWord) return;
    deleteMutation.mutate(deleteUser.id);
  };

  const canDelete = confirmWord === randomWord && randomWord.length > 0;

  const filteredUsers = users?.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios, roles y permisos del sistema.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Usuarios</CardTitle>
              <CardDescription>
                {users?.length || 0} usuarios registrados.
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, usuario o email..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                        {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: user.id, isActive: checked })
                        }
                        disabled={toggleActiveMutation.isPending || currentUser?.id === user.id}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleOpenDelete(user)}
                            disabled={currentUser?.id === user.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        onSubmit={(data) => editUser && updateMutation.mutate({ id: editUser.id, data })}
        isSubmitting={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => { if (!open) { setDeleteUser(null); setConfirmWord(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Para confirmar, escribe la palabra{" "}
              <strong className="font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                {randomWord}
              </strong>{" "}
              en el recuadro.
            </AlertDialogDescription>
            {deleteUser && (
              <p className="text-sm text-muted-foreground">
                Usuario a eliminar: <strong>{deleteUser.name || deleteUser.username}</strong>
              </p>
            )}
            <Input
              placeholder={`Escribe "${randomWord}" para confirmar`}
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
              className="font-mono mt-2"
              autoComplete="off"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={!canDelete || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; username: string; email?: string; password: string; role: string }) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("advisor");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      username: username.trim(),
      email: email.trim() || undefined,
      password,
      role,
    });
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("advisor");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario con nombre de usuario y contraseña.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nombre</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-username">Usuario (login)</Label>
            <Input
              id="create-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario"
              required
              pattern="[-a-zA-Z0-9._@+]+"
              title="Letras, números, puntos, @, guiones"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email (opcional)</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Contraseña</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "advisor");
  const [password, setPassword] = useState("");
  // 2FA activado por defecto. Solo OFF cuando el admin lo desactivó explícitamente (twoFactorEnabled === false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled !== false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setUsername(user.username);
      setEmail(user.email ?? "");
      setRole(user.role);
      setPassword("");
      setTwoFactorEnabled(user.twoFactorEnabled !== false);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name: name.trim() || user.name,
      username: username.trim(),
      email: email.trim() || null,
      role,
      twoFactorEnabled,
    };
    if (password) data.password = password;
    onSubmit(data);
    setPassword("");
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Modifica los datos del usuario. Deja la contraseña vacía para no cambiarla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-username">Usuario (login)</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario"
              required
              pattern="[-a-zA-Z0-9._@+]+"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email (opcional)</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Nueva contraseña (opcional)</Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="edit-2fa">Verificación en dos pasos (2FA)</Label>
                <p className="text-xs text-muted-foreground">Activado por defecto. Desactívalo para que este usuario no reciba código al iniciar sesión.</p>
              </div>
            </div>
            <Switch
              id="edit-2fa"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
