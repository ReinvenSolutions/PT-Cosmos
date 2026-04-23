import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle, ChevronLeft, Eye, Library, Loader2, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AcademyAdminHeader, AcademyStatPill } from "@/components/academy-digital";

type Analytics = {
  totals: {
    totalCourses: number;
    publishedCourses: number;
    totalLessons: number;
    publishedLessons: number;
    uniqueUsersWithActivity: number;
    totalLessonViews: number;
    totalCompletions: number;
  };
  byLesson: Array<{
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
    viewSum: number;
    uniqueViewers: number;
    completedCount: number;
  }>;
  byUser: Array<{
    userId: string;
    name: string | null;
    username: string;
    lessonsWithViews: number;
    lessonsCompleted: number;
    totalViews: number;
  }>;
};

export default function AdminTutorialsMetricas() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/tutorials/analytics"],
  });

  return (
    <div className="max-w-6xl space-y-8">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1 rounded-lg text-muted-foreground hover:text-foreground" asChild>
          <Link href="/admin/tutoriales">
            <ChevronLeft className="h-4 w-4" />
            Volver a cursos
          </Link>
        </Button>
        <AcademyAdminHeader
          title="Métricas de aprendizaje"
          description="Vistas, finalizaciones y participación por lección y por usuario. Úsalo para priorizar contenido y ver el impacto de la academia."
          actions={
            <Button variant="outline" className="rounded-xl border-border/80 shadow-sm" asChild>
              <Link href="/admin/tutoriales">Gestionar cursos</Link>
            </Button>
          }
        />
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm">Cargando métricas…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AcademyStatPill
              label="Cursos publicados"
              value={`${data.totals.publishedCourses}/${data.totals.totalCourses}`}
              icon={BookOpen}
            />
            <AcademyStatPill
              label="Lecciones publicadas"
              value={`${data.totals.publishedLessons}/${data.totals.totalLessons}`}
              icon={Library}
            />
            <AcademyStatPill
              label="Usuarios activos"
              value={data.totals.uniqueUsersWithActivity}
              icon={Users}
            />
            <AcademyStatPill label="Total vistas" value={data.totals.totalLessonViews} icon={Eye} />
            <AcademyStatPill
              className="xl:col-span-1"
              label="Lecciones completadas"
              value={data.totals.totalCompletions}
              icon={CheckCircle}
            />
          </div>

          <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/[0.04] to-transparent">
              <CardTitle className="text-lg">Por lección</CardTitle>
              <CardDescription>Suma de visitas, usuarios con al menos una visita y cierres de lección.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <ScrollArea className="w-full p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Curso</TableHead>
                      <TableHead>Lección</TableHead>
                      <TableHead className="text-right">Vistas (suma)</TableHead>
                      <TableHead className="text-right">Con visitas</TableHead>
                      <TableHead className="text-right">Completaron</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byLesson.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Sin actividad aún
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.byLesson.map((r) => (
                        <TableRow key={r.lessonId} className="hover:bg-muted/40">
                          <TableCell className="text-muted-foreground max-w-[140px] truncate">{r.courseTitle}</TableCell>
                          <TableCell className="font-medium max-w-[200px]">{r.lessonTitle}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.viewSum}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.uniqueViewers}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.completedCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-gradient-to-r from-cyan-500/[0.05] to-transparent">
              <CardTitle className="text-lg">Por usuario</CardTitle>
              <CardDescription>
                Lecciones con al menos una visita, completadas y visitas acumuladas (incluye re-lectura).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <ScrollArea className="w-full max-h-[420px] p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Vistas (total)</TableHead>
                      <TableHead className="text-right">Lecc. vistas (≥1)</TableHead>
                      <TableHead className="text-right">Completadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byUser.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Aún no hay progreso registrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.byUser.map((u) => (
                        <TableRow key={u.userId} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="font-medium">{(u.name && u.name.trim()) || u.username}</div>
                            <div className="text-xs text-muted-foreground">{u.username}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{u.totalViews}</TableCell>
                          <TableCell className="text-right tabular-nums">{u.lessonsWithViews}</TableCell>
                          <TableCell className="text-right tabular-nums">{u.lessonsCompleted}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
