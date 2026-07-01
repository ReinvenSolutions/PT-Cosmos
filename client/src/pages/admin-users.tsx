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
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Percent,
  Coins,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, ROLES as ROLE_IDS } from "@shared/roles";
import type { MilesMarkupType, MilesProgramsAllowed } from "@shared/milesCalculator";
import {
  canUseLifeMiles,
  canUseSmiles,
  formatMilesMarkupShort,
  normalizeMilesMarkupType,
  normalizeMilesProgramsAllowed,
} from "@shared/milesCalculator";

interface AdminUser {
  id: string;
  name: string | null;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  approvalStatus: string;
  twoFactorEnabled?: boolean;
  discountPercentage?: string | number | null;
  milesMarkupType?: string | null;
  milesMarkupValue?: string | number | null;
  milesMarkupTypeLifemiles?: string | null;
  milesMarkupValueLifemiles?: string | number | null;
  milesMarkupTypeSmiles?: string | null;
  milesMarkupValueSmiles?: string | number | null;
  milesProgramsAllowed?: string | null;
  createdAt: string;
}

const PENDING_APPROVAL_QUERY_KEY = "/api/admin/users/pending-approval-count";

function approvalStatusLabel(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  switch (status) {
    case "pending":
      return { label: "Pendiente", variant: "outline" };
    case "denied":
      return { label: "Denegado", variant: "destructive" };
    default:
      return { label: "Aprobado", variant: "secondary" };
  }
}

const ROLES = [
  { value: ROLE_IDS.SUPER_ADMIN, label: ROLE_LABELS[ROLE_IDS.SUPER_ADMIN], icon: Shield },
  { value: ROLE_IDS.AGENCY, label: ROLE_LABELS[ROLE_IDS.AGENCY], icon: UserCog },
  { value: ROLE_IDS.PROVIDER, label: ROLE_LABELS[ROLE_IDS.PROVIDER], icon: Building2 },
] as const;

const CONFIRM_WORDS = [
  "ELIMINAR", "BORRAR", "CONFIRMAR", "PERMANENTE", "ADIOS", "DESTRUIR",
  "FINAL", "TERMINAR", "SUPRIMIR", "CANCELAR", "QUITAR", "QUEMAR",
  "TURBINA", "MARIPOSA", "DINAMO", "PIZARRA", "VOLCAN", "RASCACIELOS"
];

function generateRandomWord(): string {
  return CONFIRM_WORDS[Math.floor(Math.random() * CONFIRM_WORDS.length)];
}

function milesSettingsSummary(user: AdminUser): string {
  const programs = normalizeMilesProgramsAllowed(user.milesProgramsAllowed);
  if (programs === "none") return "Ninguno";

  const parts: string[] = [];
  if (canUseLifeMiles(programs)) {
    const type = normalizeMilesMarkupType(user.milesMarkupTypeLifemiles);
    const value = Number(user.milesMarkupValueLifemiles ?? 0);
    const markup = formatMilesMarkupShort(type, value);
    parts.push(markup ? `LM ${markup}` : "LM");
  }
  if (canUseSmiles(programs)) {
    const type = normalizeMilesMarkupType(user.milesMarkupTypeSmiles);
    const value = Number(user.milesMarkupValueSmiles ?? 0);
    const markup = formatMilesMarkupShort(type, value);
    parts.push(markup ? `SM ${markup}` : "SM");
  }
  return parts.join(" · ");
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [discountUser, setDiscountUser] = useState<AdminUser | null>(null);
  const [milesSettingsUser, setMilesSettingsUser] = useState<AdminUser | null>(null);
  const [confirmWord, setConfirmWord] = useState("");
  const [randomWord, setRandomWord] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const invalidateUserLists = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    queryClient.invalidateQueries({ queryKey: [PENDING_APPROVAL_QUERY_KEY] });
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; username: string; email?: string; password: string; role: string }) =>
      apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      invalidateUserLists();
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
      invalidateUserLists();
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
      invalidateUserLists();
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
      queryClient.invalidateQueries({ queryKey: [PENDING_APPROVAL_QUERY_KEY] });
      setDeleteUser(null);
      setConfirmWord("");
      toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/users/${id}/approve`),
    onSuccess: () => {
      invalidateUserLists();
      toast({ title: "Usuario aprobado", description: "El usuario ya puede iniciar sesión en la plataforma." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/users/${id}/deny`),
    onSuccess: () => {
      invalidateUserLists();
      toast({ title: "Registro denegado", description: "El usuario no podrá acceder a la plataforma." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const discountMutation = useMutation({
    mutationFn: ({ id, discountPercentage }: { id: string; discountPercentage: number }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/discount`, { discountPercentage }),
    onSuccess: () => {
      invalidateUserLists();
      setDiscountUser(null);
      toast({
        title: "Descuento actualizado",
        description: "El porcentaje de descuento se aplicará en las cotizaciones del usuario.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const milesSettingsMutation = useMutation({
    mutationFn: ({
      id,
      milesProgramsAllowed,
      milesMarkupTypeLifemiles,
      milesMarkupValueLifemiles,
      milesMarkupTypeSmiles,
      milesMarkupValueSmiles,
    }: {
      id: string;
      milesProgramsAllowed: MilesProgramsAllowed;
      milesMarkupTypeLifemiles: MilesMarkupType;
      milesMarkupValueLifemiles: number;
      milesMarkupTypeSmiles: MilesMarkupType;
      milesMarkupValueSmiles: number;
    }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/miles-settings`, {
        milesProgramsAllowed,
        milesMarkupTypeLifemiles,
        milesMarkupValueLifemiles,
        milesMarkupTypeSmiles,
        milesMarkupValueSmiles,
      }),
    onSuccess: () => {
      invalidateUserLists();
      setMilesSettingsUser(null);
      toast({
        title: "Cotizador de millas actualizado",
        description: "La configuración se aplicará en el módulo de millas del usuario.",
      });
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
    const typed = confirmWord.trim().toUpperCase();
    if (!deleteUser || !randomWord || typed !== randomWord) return;
    deleteMutation.mutate(deleteUser.id);
  };

  const canDelete = confirmWord.trim().toUpperCase() === randomWord && randomWord.length > 0;

  const filteredUsers = users
    ?.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.approvalStatus === "pending" && b.approvalStatus !== "pending") return -1;
      if (b.approvalStatus === "pending" && a.approvalStatus !== "pending") return 1;
      return 0;
    });

  const pendingCount = users?.filter((u) => u.approvalStatus === "pending").length ?? 0;

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
                {users?.length || 0} usuarios registrados
                {pendingCount > 0 ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} de aprobación` : ""}.
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
                <TableHead>Descuento</TableHead>
                <TableHead>Cotizador millas</TableHead>
                <TableHead>Aprobación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Cargando usuarios...
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => {
                  const approval = approvalStatusLabel(user.approvalStatus);
                  const isPending = user.approvalStatus === "pending";
                  return (
                  <TableRow
                    key={user.id}
                    className={cn(
                      !user.isActive && "opacity-60",
                      isPending && "bg-amber-500/5"
                    )}
                  >
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                        {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === ROLE_IDS.AGENCY || user.role === ROLE_IDS.PROVIDER ? (
                        <button
                          type="button"
                          onClick={() => setDiscountUser(user)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          <Percent className="h-3.5 w-3.5" />
                          {Number(user.discountPercentage ?? 0) > 0
                            ? `${Number(user.discountPercentage)}%`
                            : "Sin descuento"}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === ROLE_IDS.AGENCY || user.role === ROLE_IDS.PROVIDER ? (
                        <button
                          type="button"
                          onClick={() => setMilesSettingsUser(user)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          {milesSettingsSummary(user)}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={approval.variant} className={isPending ? "border-amber-500/50 text-amber-700 dark:text-amber-400" : ""}>
                        {isPending && <Clock className="mr-1 h-3 w-3" />}
                        {approval.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: user.id, isActive: checked })
                        }
                        disabled={
                          toggleActiveMutation.isPending ||
                          currentUser?.id === user.id ||
                          isPending
                        }
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveMutation.mutate(user.id)}
                            disabled={approveMutation.isPending || denyMutation.isPending}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => denyMutation.mutate(user.id)}
                            disabled={approveMutation.isPending || denyMutation.isPending}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Denegar
                          </Button>
                        </div>
                      ) : (
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
                          {(user.role === ROLE_IDS.AGENCY || user.role === ROLE_IDS.PROVIDER) && (
                            <DropdownMenuItem onClick={() => setDiscountUser(user)}>
                              <Percent className="mr-2 h-4 w-4" />
                              Asignar descuento
                            </DropdownMenuItem>
                          )}
                          {(user.role === ROLE_IDS.AGENCY || user.role === ROLE_IDS.PROVIDER) && (
                            <DropdownMenuItem onClick={() => setMilesSettingsUser(user)}>
                              <Coins className="mr-2 h-4 w-4" />
                              Cotizador de millas
                            </DropdownMenuItem>
                          )}
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
                      )}
                    </TableCell>
                  </TableRow>
                );
                })
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

      {/* Discount Dialog */}
      <DiscountDialog
        user={discountUser}
        onOpenChange={(open) => !open && setDiscountUser(null)}
        onSubmit={(discountPercentage) =>
          discountUser && discountMutation.mutate({ id: discountUser.id, discountPercentage })
        }
        isSubmitting={discountMutation.isPending}
      />

      {/* Miles Settings Dialog */}
      <MilesSettingsDialog
        user={milesSettingsUser}
        onOpenChange={(open) => !open && setMilesSettingsUser(null)}
        onSubmit={(data) =>
          milesSettingsUser &&
          milesSettingsMutation.mutate({ id: milesSettingsUser.id, ...data })
        }
        isSubmitting={milesSettingsMutation.isPending}
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
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Se eliminarán también las cotizaciones guardadas y el historial de ese usuario. Esta acción no se puede
                  deshacer.
                </p>
                <p>
                  Para confirmar, escribe la palabra{" "}
                  <strong className="font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                    {randomWord || "…"}
                  </strong>{" "}
                  en el recuadro (mayúsculas, sin espacios al inicio o al final).
                </p>
              </div>
            </AlertDialogDescription>
            {deleteUser && (
              <p className="text-sm text-muted-foreground">
                Usuario a eliminar: <strong>{deleteUser.name || deleteUser.username}</strong>
              </p>
            )}
            <Input
              placeholder={randomWord ? `Escribe "${randomWord}" para confirmar` : "Abriendo…"}
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
              className="font-mono mt-2"
              autoComplete="off"
              disabled={!randomWord}
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

function MilesMarkupSection({
  programLabel,
  markupType,
  markupValue,
  onTypeChange,
  onValueChange,
}: {
  programLabel: string;
  markupType: MilesMarkupType;
  markupValue: string;
  onTypeChange: (type: MilesMarkupType) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <p className="text-sm font-medium text-foreground">Recargo {programLabel}</p>
      <div className="space-y-2">
        <Label>Tipo de recargo</Label>
        <Select value={markupType} onValueChange={(v) => onTypeChange(v as MilesMarkupType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin recargo</SelectItem>
            <SelectItem value="percentage">Porcentaje sobre el total</SelectItem>
            <SelectItem value="fixed">Tarifa fija adicional (COP)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {markupType !== "none" && (
        <div className="space-y-2">
          <Label>
            {markupType === "percentage" ? "Porcentaje (%)" : "Valor fijo (COP)"}
          </Label>
          <Input
            type="number"
            min={0}
            max={markupType === "percentage" ? 100 : undefined}
            step={markupType === "percentage" ? 0.01 : 1}
            value={markupValue}
            onChange={(e) => onValueChange(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            {markupType === "percentage"
              ? "Se suma al total calculado con este programa antes de redondear."
              : "Se suma una cantidad fija en pesos al total calculado con este programa."}
          </p>
        </div>
      )}
    </div>
  );
}

function MilesSettingsDialog({
  user,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    milesProgramsAllowed: MilesProgramsAllowed;
    milesMarkupTypeLifemiles: MilesMarkupType;
    milesMarkupValueLifemiles: number;
    milesMarkupTypeSmiles: MilesMarkupType;
    milesMarkupValueSmiles: number;
  }) => void;
  isSubmitting: boolean;
}) {
  const [milesProgramsAllowed, setMilesProgramsAllowed] = useState<MilesProgramsAllowed>("both");
  const [lifemilesMarkupType, setLifemilesMarkupType] = useState<MilesMarkupType>("none");
  const [lifemilesMarkupValue, setLifemilesMarkupValue] = useState("0");
  const [smilesMarkupType, setSmilesMarkupType] = useState<MilesMarkupType>("none");
  const [smilesMarkupValue, setSmilesMarkupValue] = useState("0");

  useEffect(() => {
    if (user) {
      setMilesProgramsAllowed(normalizeMilesProgramsAllowed(user.milesProgramsAllowed));
      setLifemilesMarkupType(
        (user.milesMarkupTypeLifemiles as MilesMarkupType) ??
          (user.milesMarkupType as MilesMarkupType) ??
          "none",
      );
      setLifemilesMarkupValue(
        String(Number(user.milesMarkupValueLifemiles ?? user.milesMarkupValue ?? 0)),
      );
      setSmilesMarkupType(
        (user.milesMarkupTypeSmiles as MilesMarkupType) ??
          (user.milesMarkupType as MilesMarkupType) ??
          "none",
      );
      setSmilesMarkupValue(
        String(Number(user.milesMarkupValueSmiles ?? user.milesMarkupValue ?? 0)),
      );
    }
  }, [user]);

  if (!user) return null;

  const showLifeMilesMarkup = canUseLifeMiles(milesProgramsAllowed);
  const showSmilesMarkup = canUseSmiles(milesProgramsAllowed);

  const parseMarkupValue = (type: MilesMarkupType, raw: string): number | null => {
    const value = parseFloat(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    if (type === "percentage" && value > 100) return null;
    return value;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lifemilesValue = showLifeMilesMarkup
      ? parseMarkupValue(lifemilesMarkupType, lifemilesMarkupValue)
      : 0;
    const smilesValue = showSmilesMarkup
      ? parseMarkupValue(smilesMarkupType, smilesMarkupValue)
      : 0;

    if (showLifeMilesMarkup && lifemilesValue === null) return;
    if (showSmilesMarkup && smilesValue === null) return;

    onSubmit({
      milesProgramsAllowed,
      milesMarkupTypeLifemiles: showLifeMilesMarkup ? lifemilesMarkupType : "none",
      milesMarkupValueLifemiles: showLifeMilesMarkup ? lifemilesValue! : 0,
      milesMarkupTypeSmiles: showSmilesMarkup ? smilesMarkupType : "none",
      milesMarkupValueSmiles: showSmilesMarkup ? smilesValue! : 0,
    });
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cotizador de millas</DialogTitle>
          <DialogDescription>
            Configura programas habilitados y recargos por tipo de millas para{" "}
            <strong>{user.name || user.username}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Programas habilitados</Label>
            <Select
              value={milesProgramsAllowed}
              onValueChange={(v) => setMilesProgramsAllowed(v as MilesProgramsAllowed)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno (sin acceso)</SelectItem>
                <SelectItem value="both">LifeMiles y Smiles</SelectItem>
                <SelectItem value="lifemiles">Solo LifeMiles</SelectItem>
                <SelectItem value="smiles">Solo Smiles</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showLifeMilesMarkup && (
            <MilesMarkupSection
              programLabel="LifeMiles"
              markupType={lifemilesMarkupType}
              markupValue={lifemilesMarkupValue}
              onTypeChange={setLifemilesMarkupType}
              onValueChange={setLifemilesMarkupValue}
            />
          )}
          {showSmilesMarkup && (
            <MilesMarkupSection
              programLabel="Smiles"
              markupType={smilesMarkupType}
              markupValue={smilesMarkupValue}
              onTypeChange={setSmilesMarkupType}
              onValueChange={setSmilesMarkupValue}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Guardar configuración
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({
  user,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (discountPercentage: number) => void;
  isSubmitting: boolean;
}) {
  const [discountPercentage, setDiscountPercentage] = useState("0");

  useEffect(() => {
    if (user) {
      setDiscountPercentage(String(Number(user.discountPercentage ?? 0)));
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(discountPercentage);
    if (!Number.isFinite(value) || value < 0 || value > 100) return;
    onSubmit(value);
  };

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar descuento</DialogTitle>
          <DialogDescription>
            Define el porcentaje de descuento sobre la porción terrestre para{" "}
            <strong>{user.name || user.username}</strong>. Se aplicará automáticamente en sus cotizaciones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discount-percentage">Porcentaje de descuento (%)</Label>
            <div className="relative">
              <Input
                id="discount-percentage"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="Ej: 20"
                required
                className="pr-8"
              />
              <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ejemplo: con 20% sobre un plan de US$ 710, la porción terrestre quedará en US$ 568.
              El descuento no aplica a vuelos, asistencia ni mejoras.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Guardar descuento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [role, setRole] = useState<string>("agency");

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
    setRole("agency");
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
  const [role, setRole] = useState(user?.role ?? "agency");
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
