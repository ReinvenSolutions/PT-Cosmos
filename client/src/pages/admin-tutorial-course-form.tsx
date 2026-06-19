import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidatePublicTutorialQueries } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ChevronLeft, Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AcademyAdminHeader } from "@/components/academy-digital";

type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  isPublished: boolean;
  lessons: Array<{
    id: string;
    title: string;
    body: string;
    videoUrl: string | null;
    displayOrder: number;
    isPublished: boolean;
  }>;
};

export default function AdminTutorialCourseForm() {
  const [, routeParams] = useRoute("/admin/tutoriales/curso/:id");
  const id = routeParams?.id ?? "new";
  const isNew = id === "new" || !id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(false);

  const { data, isLoading } = useQuery<CourseDetail>({
    queryKey: ["/api/admin/tutorial-courses", id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tutorial-courses/${id}/detail`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar el curso");
      return res.json();
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setDescription(data.description ?? "");
      setDisplayOrder(data.displayOrder ?? 0);
      setIsPublished(data.isPublished);
    }
  }, [data]);

  const saveCourse = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const res = await apiRequest("POST", "/api/admin/tutorial-courses", {
          title: title.trim() || "Sin título",
          description: description.trim() || null,
          displayOrder,
          isPublished,
        });
        return res.json() as { id: string };
      }
      const res = await apiRequest("PUT", `/api/admin/tutorial-courses/${id}`, {
        title: title.trim() || "Sin título",
        description: description.trim() || null,
        displayOrder,
        isPublished,
      });
      return res.json() as { id: string };
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutorial-courses"] });
      invalidatePublicTutorialQueries(queryClient);
      toast({ title: isNew ? "Curso creado" : "Curso actualizado" });
      if (isNew && row?.id) {
        setLocation(`/admin/tutoriales/curso/${row.id}`);
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const [lessonOpen, setLessonOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<null | (CourseDetail["lessons"][0] & { isNew?: boolean })>(null);
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);

  const saveLesson = useMutation({
    mutationFn: async () => {
      if (!editingLesson || isNew) return;
      if (editingLesson.isNew) {
        const res = await apiRequest("POST", "/api/admin/tutorial-lessons", {
          courseId: id,
          title: editingLesson.title.trim() || "Lección",
          body: editingLesson.body,
          videoUrl: editingLesson.videoUrl?.trim() || null,
          displayOrder: editingLesson.displayOrder,
          isPublished: editingLesson.isPublished,
        });
        return res.json();
      }
      const res = await apiRequest("PUT", `/api/admin/tutorial-lessons/${editingLesson.id}`, {
        title: editingLesson.title.trim() || "Lección",
        body: editingLesson.body,
        videoUrl: editingLesson.videoUrl?.trim() || null,
        displayOrder: editingLesson.displayOrder,
        isPublished: editingLesson.isPublished,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutorial-courses", id, "detail"] });
      invalidatePublicTutorialQueries(queryClient);
      setLessonOpen(false);
      setEditingLesson(null);
      toast({ title: "Lección guardada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteLessonM = useMutation({
    mutationFn: (lessonId: string) => apiRequest("DELETE", `/api/admin/tutorial-lessons/${lessonId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tutorial-courses", id, "detail"] });
      invalidatePublicTutorialQueries(queryClient);
      setDeleteLessonId(null);
      toast({ title: "Lección eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lessons = data?.lessons ?? [];
  const sorted = [...lessons].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 rounded-lg text-muted-foreground hover:text-foreground" asChild>
          <Link href="/admin/tutoriales">
            <ChevronLeft className="h-4 w-4" />
            Volver a cursos
          </Link>
        </Button>
        <AcademyAdminHeader
          title={isNew ? "Nuevo curso" : "Editar curso"}
          description="Define título, descripción y visibilidad. Las lecciones se gestionan en la misma pantalla una vez guardado el curso."
        />
      </div>
      <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-primary/60 via-cyan-500/40 to-amber-400/50" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Datos del curso</CardTitle>
          <CardDescription>Lo que verán las agencias en el listado de Tutoriales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del curso" />
          </div>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Resumen que verán en el listado de Tutoriales"
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Orden</Label>
              <Input
                type="number"
                className="w-28"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pub" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="pub">Publicado (visible con lecciones publicadas)</Label>
            </div>
          </div>
          <Button className="rounded-xl" onClick={() => saveCourse.mutate()} disabled={saveCourse.isPending}>
            {saveCourse.isPending ? "Guardando…" : isNew ? "Crear curso" : "Guardar curso"}
          </Button>
        </CardContent>
      </Card>

      {!isNew && (
        <Card className="border-border/80 bg-card/95 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Lecciones</CardTitle>
              <CardDescription className="text-sm">Orden, texto, video y publicación por lección.</CardDescription>
            </div>
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => {
                setEditingLesson({
                  id: "",
                  title: "",
                  body: "",
                  videoUrl: null,
                  displayOrder: sorted.length,
                  isPublished: true,
                  isNew: true,
                } as any);
                setLessonOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir lección
            </Button>
          </CardHeader>
          <CardContent>
            {sorted.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No hay lecciones. Añade la primera.
              </p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/50 p-3 transition-colors hover:border-primary/20 hover:bg-card"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-1">{l.title}</div>
                        <div className="text-xs text-muted-foreground">Orden: {l.displayOrder}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {l.isPublished ? <Badge className="text-xs">ON</Badge> : <Badge variant="secondary">OFF</Badge>}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingLesson(l);
                          setLessonOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteLessonId(l.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={lessonOpen} onOpenChange={(o) => !o && setLessonOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson?.isNew ? "Nueva lección" : "Editar lección"}</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contenido (texto)</Label>
                <Textarea
                  rows={12}
                  value={editingLesson.body}
                  onChange={(e) => setEditingLesson({ ...editingLesson, body: e.target.value })}
                  placeholder="Contenido de la lección"
                />
              </div>
              <div className="space-y-2">
                <Label>URL de video (YouTube, opcional)</Label>
                <Input
                  value={editingLesson.videoUrl ?? ""}
                  onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value || null })}
                  placeholder="https://www.youtube.com/watch?v=… o youtu.be/… (con o sin https://)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={editingLesson.displayOrder}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, displayOrder: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-7">
                  <Switch
                    checked={editingLesson.isPublished}
                    onCheckedChange={(v) => setEditingLesson({ ...editingLesson, isPublished: v })}
                  />
                  <Label>Publicada</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (isNew) {
                  toast({
                    title: "Guarda el curso primero",
                    description: "Crea el curso antes de añadir lecciones.",
                    variant: "destructive",
                  });
                  return;
                }
                saveLesson.mutate();
              }}
              disabled={saveLesson.isPending}
            >
              {saveLesson.isPending ? "Guardando…" : "Guardar lección"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLessonId} onOpenChange={() => setDeleteLessonId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lección?</AlertDialogTitle>
            <AlertDialogDescription>Se perderá el progreso de los usuarios asociado a esta lección.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLessonId && deleteLessonM.mutate(deleteLessonId)}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
