import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, invalidatePublicTutorialQueries } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, BarChart3, Trash2, BookOpen, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { useState } from "react";
import { AcademyAdminHeader } from "@/components/academy-digital";

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string | null;
  lessonCount: number;
};

export default function AdminTutorials() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery<CourseRow[]>({
    queryKey: ["/api/admin/tutorial-courses"],
  });

  const patchM = useMutation({
    mutationFn: async (row: { id: string; isPublished: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/tutorial-courses/${row.id}`, {
        isPublished: row.isPublished,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutorial-courses"] });
      invalidatePublicTutorialQueries(queryClient);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tutorial-courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutorial-courses"] });
      invalidatePublicTutorialQueries(queryClient);
      toast({ title: "Curso eliminado" });
      setDeleteId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="max-w-4xl space-y-8">
      <AcademyAdminHeader
        title="Cursos y lecciones"
        description="Diseña la experiencia de aprendizaje: cursos, lecciones y publicación. Los asesores consumen el contenido en la sección Tutoriales y su avance se registra en tiempo real."
        actions={
          <>
            <Button variant="outline" className="rounded-xl border-border/80 shadow-sm" asChild>
              <Link href="/admin/tutoriales/metricas">
                <BarChart3 className="h-4 w-4 mr-2" />
                Métricas
              </Link>
            </Button>
            <Button className="rounded-xl shadow-sm" asChild>
              <Link href="/admin/tutoriales/curso/new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo curso
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm">Cargando cursos…</p>
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/15 bg-gradient-to-b from-card to-primary/[0.02] shadow-none">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <BookOpen className="h-8 w-8 text-primary/70" />
            </div>
            <p className="mb-1 font-medium text-foreground">Aún no hay cursos</p>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">Crea el primero y añade lecciones para que aparezca en Tutoriales.</p>
            <Button className="rounded-xl" asChild>
              <Link href="/admin/tutoriales/curso/new">Crear curso</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden border-border/80 bg-card/90 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={
                  c.isPublished
                    ? "h-1 bg-gradient-to-r from-primary/70 via-cyan-500/50 to-emerald-500/50"
                    : "h-1 bg-muted"
                }
              />
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 pt-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg leading-snug tracking-tight">{c.title}</CardTitle>
                    {c.isPublished ? (
                      <Badge className="font-normal">Publicado</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        Borrador
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {c.lessonCount} lección
                      {c.lessonCount === 1 ? "" : "es"}
                    </span>
                  </div>
                  {c.description && <CardDescription className="mt-1.5 line-clamp-2">{c.description}</CardDescription>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button size="icon" variant="ghost" className="rounded-lg" asChild>
                    <Link href={`/admin/tutoriales/curso/${c.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-lg" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 border-t border-border/50 bg-muted/20 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Label htmlFor={`pub-${c.id}`} className="text-sm text-muted-foreground">
                    Visible en Tutoriales
                  </Label>
                  <Switch
                    id={`pub-${c.id}`}
                    checked={c.isPublished}
                    disabled={patchM.isPending}
                    onCheckedChange={(v) => patchM.mutate({ id: c.id, isPublished: v })}
                  />
                </div>
                <Button size="sm" variant="secondary" className="w-fit rounded-lg" asChild>
                  <Link href={`/admin/tutoriales/curso/${c.id}`}>Editar contenido</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todas las lecciones y el historial de progreso vinculado. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteM.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
