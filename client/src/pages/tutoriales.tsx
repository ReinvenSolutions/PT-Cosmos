import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  PlayCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  LayoutList,
  Clock,
  Award,
  Video,
  FileText,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AcademyPublicHero, AcademySection } from "@/components/academy-digital";
import { youtubeUrlToEmbed } from "@/lib/youtubeEmbed";
import confetti from "canvas-confetti";

type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  displayOrder: number;
  createdAt: string | null;
  publishedLessonCount: number;
  completedLessonCount: number;
  progressPercent: number;
};

type CourseDetail = {
  course: { id: string; title: string; description: string | null; displayOrder: number; isPublished: boolean };
  lessons: Array<{
    id: string;
    title: string;
    body: string;
    videoUrl: string | null;
    displayOrder: number;
    isPublished: boolean;
    progress: { viewCount: number; completedAt: string | null; lastViewedAt: string | null } | null;
  }>;
};

type LessonDetail = {
  lesson: { id: string; title: string; body: string; videoUrl: string | null };
  course: { id: string; title: string };
  progress: { viewCount: number; completedAt: string | null } | null;
};

/* ---------------------------------------------------------------------
 * Celebración sobria al completar: confeti corto con paleta Cosmos
 * ------------------------------------------------------------------- */
function celebrate() {
  const colors = ["#205567", "#C6A242", "#8CC7D5"];
  const defaults = { spread: 70, ticks: 50, gravity: 1, decay: 0.94, startVelocity: 30, colors };
  confetti({ ...defaults, particleCount: 40, scalar: 1, origin: { y: 0.3, x: 0.5 } });
  setTimeout(() => confetti({ ...defaults, particleCount: 20, scalar: 0.8, origin: { y: 0.4, x: 0.2 } }), 150);
  setTimeout(() => confetti({ ...defaults, particleCount: 20, scalar: 0.8, origin: { y: 0.4, x: 0.8 } }), 250);
}

/* ---------------------------------------------------------------------
 * Miniatura de curso: bloque con iconografía e índice, sin gradientes ruidosos
 * ------------------------------------------------------------------- */
function CourseThumb({ index, progressPercent }: { index: number; progressPercent: number }) {
  const isDone = progressPercent >= 100;
  return (
    <div className="relative flex h-28 w-full shrink-0 items-center justify-between overflow-hidden bg-gradient-to-br from-[hsl(197_45%_20%)] via-[hsl(197_53%_28%)] to-[hsl(191_40%_38%)] px-5 text-white sm:h-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 10%, rgba(198,162,66,0.6) 0, transparent 35%), radial-gradient(circle at 10% 90%, rgba(140,199,213,0.6) 0, transparent 40%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm">
          <BookOpen className="h-5 w-5 text-white/90" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Curso {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      {isDone ? (
        <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Completo
        </span>
      ) : progressPercent > 0 ? (
        <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-[hsl(44_54%_52%)] px-2.5 py-1 text-[11px] font-semibold text-[hsl(197_53%_15%)]">
          En progreso
        </span>
      ) : (
        <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85">
          Nuevo
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Fila de lección en el temario (sidebar). Clara, con estado y acción.
 * ------------------------------------------------------------------- */
function LessonRow({
  index,
  title,
  done,
  active,
  hasVideo,
}: {
  index: number;
  title: string;
  done: boolean;
  active: boolean;
  hasVideo: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3 py-2 transition-all",
        active
          ? "border-primary/30 bg-primary/[0.07] shadow-sm"
          : "border-transparent hover:border-border hover:bg-muted/60",
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" aria-hidden />
      )}
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
          done
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground",
        )}
        aria-hidden
      >
        {done ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "line-clamp-2 text-[13px] font-medium leading-snug",
            done ? "text-muted-foreground" : active ? "text-foreground" : "text-foreground/90",
          )}
        >
          {title}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {hasVideo ? <Video className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          <span>{hasVideo ? "Video + texto" : "Lectura"}</span>
        </p>
      </div>
      {active ? (
        <Play className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Chip compacto (móvil, carrusel horizontal)
 * ------------------------------------------------------------------- */
function LessonChip({
  index,
  title,
  done,
  active,
}: {
  index: number;
  title: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-h-[2.75rem] max-w-[13rem] shrink-0 snap-center items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
        active
          ? "border-primary/35 bg-primary/[0.08] text-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
          done
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
      </span>
      <span
        className={cn(
          "line-clamp-2 min-w-0 text-[12px] leading-tight",
          done && "line-through decoration-muted-foreground/40",
        )}
      >
        {title}
      </span>
    </div>
  );
}

export default function Tutoriales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [path, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"content" | "resources">("content");

  const route = useMemo(() => {
    const norm = path.replace(/\/$/, "") || "/";
    const mLesson = norm.match(/^\/tutoriales\/curso\/([^/]+)\/leccion\/([^/]+)$/);
    if (mLesson) {
      return { type: "lesson" as const, courseId: mLesson[1], lessonId: mLesson[2] };
    }
    const mCourse = norm.match(/^\/tutoriales\/curso\/([^/]+)$/);
    if (mCourse) {
      return { type: "course" as const, courseId: mCourse[1] };
    }
    if (norm === "/tutoriales") {
      return { type: "list" as const };
    }
    return { type: "other" as const };
  }, [path]);
  const courseId = route.type === "lesson" ? route.courseId : route.type === "course" ? route.courseId : undefined;
  const lessonId = route.type === "lesson" ? route.lessonId : undefined;

  const { data: courses = [], isLoading: loadCourses } = useQuery<CourseSummary[]>({
    queryKey: ["/api/tutorials/courses"],
  });

  const { data: courseDetail, isLoading: loadDetail } = useQuery<CourseDetail>({
    queryKey: ["/api/tutorials/courses", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/tutorials/courses/${courseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar el curso");
      return res.json();
    },
    enabled: !!courseId && (route.type === "course" || route.type === "lesson"),
  });

  const { data: lessonDetail, isLoading: loadLesson } = useQuery<LessonDetail>({
    queryKey: ["/api/tutorials/lessons", lessonId],
    queryFn: async () => {
      const res = await fetch(`/api/tutorials/lessons/${lessonId}`, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la lección");
      return res.json();
    },
    enabled: !!lessonId,
  });

  useEffect(() => {
    if (!lessonId) return;
    apiRequest("POST", `/api/tutorials/lessons/${lessonId}/view`).catch(() => {
      /* ignore */
    });
  }, [lessonId]);

  const completeM = useMutation({
    mutationFn: async (lid: string) => {
      const res = await apiRequest("POST", `/api/tutorials/lessons/${lid}/complete`);
      return (await res.json()) as { progress: { completedAt: string } };
    },
    onMutate: async (lid: string) => {
      if (!courseId) return;
      const now = new Date().toISOString();
      await queryClient.cancelQueries({ queryKey: ["/api/tutorials/courses", courseId] });
      await queryClient.cancelQueries({ queryKey: ["/api/tutorials/lessons", lid] });
      const prevCourse = queryClient.getQueryData<CourseDetail>(["/api/tutorials/courses", courseId]);
      const prevLesson = queryClient.getQueryData<LessonDetail>(["/api/tutorials/lessons", lid]);
      if (prevCourse) {
        queryClient.setQueryData<CourseDetail>(["/api/tutorials/courses", courseId], {
          ...prevCourse,
          lessons: prevCourse.lessons.map((l) =>
            l.id === lid
              ? {
                  ...l,
                  progress: {
                    viewCount: l.progress?.viewCount ?? 0,
                    completedAt: now,
                    lastViewedAt: l.progress?.lastViewedAt ?? null,
                  },
                }
              : l,
          ),
        });
      }
      if (prevLesson) {
        queryClient.setQueryData<LessonDetail>(["/api/tutorials/lessons", lid], {
          ...prevLesson,
          progress: {
            viewCount: prevLesson.progress?.viewCount ?? 0,
            completedAt: now,
          },
        });
      }
      return { prevCourse, prevLesson, lid } as {
        prevCourse: CourseDetail | undefined;
        prevLesson: LessonDetail | undefined;
        lid: string;
      };
    },
    onError: (e: Error, _lid, context) => {
      if (context?.prevCourse && courseId) {
        queryClient.setQueryData(["/api/tutorials/courses", courseId], context.prevCourse);
      }
      if (context?.prevLesson && context.lid) {
        queryClient.setQueryData(["/api/tutorials/lessons", context.lid], context.prevLesson);
      }
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
    onSuccess: (_data, lid) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorials/courses"] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tutorials/courses", courseId] });
      }
      if (lid) {
        queryClient.invalidateQueries({ queryKey: ["/api/tutorials/lessons", lid] });
      }
      toast({ title: "Lección completada", description: "¡Excelente! Seguí con la siguiente." });
      celebrate();
    },
  });

  const uncompleteM = useMutation({
    mutationFn: async (lid: string) => {
      const res = await apiRequest("POST", `/api/tutorials/lessons/${lid}/uncomplete`);
      return (await res.json()) as { progress: { completedAt: null } & Record<string, unknown> };
    },
    onMutate: async (lid: string) => {
      if (!courseId) return;
      await queryClient.cancelQueries({ queryKey: ["/api/tutorials/courses", courseId] });
      await queryClient.cancelQueries({ queryKey: ["/api/tutorials/lessons", lid] });
      const prevCourse = queryClient.getQueryData<CourseDetail>(["/api/tutorials/courses", courseId]);
      const prevLesson = queryClient.getQueryData<LessonDetail>(["/api/tutorials/lessons", lid]);
      if (prevCourse) {
        queryClient.setQueryData<CourseDetail>(["/api/tutorials/courses", courseId], {
          ...prevCourse,
          lessons: prevCourse.lessons.map((l) =>
            l.id === lid
              ? {
                  ...l,
                  progress: l.progress
                    ? {
                        viewCount: l.progress.viewCount,
                        completedAt: null,
                        lastViewedAt: l.progress.lastViewedAt,
                      }
                    : { viewCount: 0, completedAt: null, lastViewedAt: null },
                }
              : l,
          ),
        });
      }
      if (prevLesson?.progress) {
        queryClient.setQueryData<LessonDetail>(["/api/tutorials/lessons", lid], {
          ...prevLesson,
          progress: {
            viewCount: prevLesson.progress.viewCount,
            completedAt: null,
          },
        });
      }
      return { prevCourse, prevLesson, lid } as {
        prevCourse: CourseDetail | undefined;
        prevLesson: LessonDetail | undefined;
        lid: string;
      };
    },
    onError: (e: Error, _lid, context) => {
      if (context?.prevCourse && courseId) {
        queryClient.setQueryData(["/api/tutorials/courses", courseId], context.prevCourse);
      }
      if (context?.prevLesson && context.lid) {
        queryClient.setQueryData(["/api/tutorials/lessons", context.lid], context.prevLesson);
      }
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
    onSuccess: (_data, lid) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorials/courses"] });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tutorials/courses", courseId] });
      }
      if (lid) {
        queryClient.invalidateQueries({ queryKey: ["/api/tutorials/lessons", lid] });
      }
      toast({ title: "Lección desmarcada" });
    },
  });

  useEffect(() => {
    if (route.type !== "course" || !courseId) return;
    if (!courseDetail?.lessons?.length) return;
    setLocation(`/tutoriales/curso/${courseId}/leccion/${courseDetail.lessons[0].id}`);
  }, [route.type, courseId, courseDetail, setLocation]);

  const overallStats = useMemo(() => {
    if (!courses.length) return { total: 0, completed: 0, inProgress: 0, avg: 0 };
    const total = courses.length;
    const completed = courses.filter((c) => c.progressPercent >= 100).length;
    const inProgress = courses.filter((c) => c.progressPercent > 0 && c.progressPercent < 100).length;
    const avg = Math.round(courses.reduce((a, c) => a + c.progressPercent, 0) / courses.length);
    return { total, completed, inProgress, avg };
  }, [courses]);

  const courseProgress = useMemo(() => {
    const lessons = courseDetail?.lessons;
    if (!lessons?.length) return { completed: 0, total: 0, percent: 0 };
    const total = lessons.length;
    const completed = lessons.filter((l) => l.progress?.completedAt).length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [courseDetail]);

  /* =========================================================
   * VISTA: LISTADO DE CURSOS
   * ======================================================= */
  if (route.type === "list") {
    return (
      <AcademySection className="mx-auto w-full max-w-7xl space-y-7 sm:space-y-9 2xl:max-w-[min(100rem,calc(100%-1.5rem))]">
        <AcademyPublicHero
          badge="Aprende a tu ritmo"
          subtitle="Capacitación práctica para dominar la venta de viajes. Tu progreso se guarda automáticamente; retomá cuando quieras, desde cualquier dispositivo."
          stats={
            courses.length > 0 && !loadCourses ? (
              <div className="grid grid-cols-3 gap-3 text-center lg:text-left">
                <div className="rounded-xl border border-card-border bg-background/60 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cursos</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{overallStats.total}</p>
                </div>
                <div className="rounded-xl border border-card-border bg-background/60 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avance</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-primary">{overallStats.avg}%</p>
                </div>
                <div className="rounded-xl border border-card-border bg-background/60 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Finalizados</p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-[hsl(44_54%_45%)]">
                    {overallStats.completed}
                  </p>
                </div>
              </div>
            ) : null
          }
        />

        {loadCourses ? (
          <div className="flex justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Cargando cursos…</p>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed border-2 border-border bg-card/60 shadow-none">
            <CardContent className="flex flex-col items-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aún no hay cursos publicados. Vuelve pronto.</p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">Catálogo de cursos</h2>
                <p className="text-sm text-muted-foreground">
                  {overallStats.inProgress > 0
                    ? `Tienes ${overallStats.inProgress} curso${overallStats.inProgress === 1 ? "" : "s"} en progreso`
                    : "Empieza por el curso que prefieras"}
                </p>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-6">
              {courses.map((c, i) => (
                <Link key={c.id} href={`/tutoriales/curso/${c.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col overflow-hidden border-card-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                    <CourseThumb index={i} progressPercent={c.progressPercent} />
                    <CardContent className="flex flex-1 flex-col p-5">
                      <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {c.title}
                      </h3>
                      {c.description && (
                        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <LayoutList className="h-3.5 w-3.5" />
                          {c.publishedLessonCount} {c.publishedLessonCount === 1 ? "lección" : "lecciones"}
                        </span>
                        {c.completedLessonCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {c.completedLessonCount} completas
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                          <span>Tu progreso</span>
                          <span className="tabular-nums text-foreground">{c.progressPercent}%</span>
                        </div>
                        <Progress value={c.progressPercent} className="h-1.5" />
                        <div className="mt-4 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                            {c.progressPercent === 0
                              ? "Empezar curso"
                              : c.progressPercent >= 100
                                ? "Repasar curso"
                                : "Continuar"}
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                          {c.progressPercent >= 100 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <Award className="h-3 w-3" />
                              Finalizado
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </AcademySection>
    );
  }

  /* =========================================================
   * VISTA: LECCIÓN (layout de dos columnas estilo LMS)
   * ======================================================= */
  if (courseId && (route.type === "course" || route.type === "lesson")) {
    if (loadDetail) {
      return (
        <AcademySection>
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Cargando curso…</p>
            </div>
          </div>
        </AcademySection>
      );
    }
    if (!courseDetail) {
      return (
        <AcademySection>
          <div className="mx-auto max-w-md rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">No se encontró el curso.</p>
            <Button
              variant="ghost"
              onClick={() => setLocation("/tutoriales")}
              className="mt-3 text-primary underline-offset-4 hover:underline"
            >
              Volver a la academia
            </Button>
          </div>
        </AcademySection>
      );
    }
    if (route.type === "course" && (!courseDetail.lessons || courseDetail.lessons.length === 0)) {
      return (
        <AcademySection>
          <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-card-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <GraduationCap className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Este curso aún no tiene lecciones publicadas.</p>
            <Button variant="outline" onClick={() => setLocation("/tutoriales")}>
              Volver
            </Button>
          </div>
        </AcademySection>
      );
    }

    const lessonIndex =
      lessonId && courseDetail.lessons ? courseDetail.lessons.findIndex((l) => l.id === lessonId) : -1;
    const prevLesson = lessonIndex > 0 ? courseDetail.lessons[lessonIndex - 1] : null;
    const nextLesson =
      lessonIndex >= 0 && lessonIndex < courseDetail.lessons.length - 1
        ? courseDetail.lessons[lessonIndex + 1]
        : null;
    const totalLessons = courseDetail.lessons.length;
    const currentNum = lessonIndex >= 0 ? lessonIndex + 1 : 0;

    const youTubeEmbed = lessonDetail?.lesson.videoUrl ? youtubeUrlToEmbed(lessonDetail.lesson.videoUrl) : null;

    return (
      <AcademySection className="mx-auto w-full max-w-[min(100rem,calc(100%-0.25rem))] space-y-4 sm:max-w-[min(100rem,calc(100%-0.5rem))] sm:space-y-5 2xl:max-w-[min(110rem,100%-1.5rem)]">
        {/* Breadcrumb / volver */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/tutoriales">
              <ChevronLeft className="h-4 w-4" />
              Academia
            </Link>
          </Button>
          <span className="text-muted-foreground/50">/</span>
          <span className="line-clamp-1 text-sm font-medium text-foreground">{courseDetail.course.title}</span>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-7 2xl:grid-cols-[26rem_minmax(0,1fr)]">
          {/* Columna principal: video + contenido de la lección (derecha en desktop) */}
          <main className="min-w-0 space-y-4 sm:space-y-5 lg:order-2">
            {route.type === "lesson" && lessonId ? (
              loadLesson ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Cargando lección…</p>
                  </div>
                </div>
              ) : !lessonDetail ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                  Lección no disponible.
                </div>
              ) : (
                <>
                  {/* Player de video: pieza central */}
                  {lessonDetail.lesson.videoUrl ? (
                    <Card className="overflow-hidden border-card-border bg-card shadow-sm">
                      {youTubeEmbed ? (
                        <div className="relative w-full bg-black">
                          <div className="aspect-video w-full">
                            <iframe
                              key={lessonDetail.lesson.videoUrl}
                              title={lessonDetail.lesson.title}
                              src={youTubeEmbed}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              referrerPolicy="strict-origin-when-cross-origin"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-muted">
                          <a
                            href={lessonDetail.lesson.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                          >
                            <PlayCircle className="h-5 w-5" />
                            Abrir video
                          </a>
                        </div>
                      )}
                    </Card>
                  ) : null}

                  {/* Encabezado de la lección */}
                  <Card className="border-card-border bg-card shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-card-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      <div className="min-w-0 space-y-1.5">
                        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
                          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px]">
                            {String(currentNum).padStart(2, "0")}
                          </span>
                          Lección {currentNum} de {totalLessons}
                        </p>
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.55rem] md:text-2xl">
                          {lessonDetail.lesson.title}
                        </h1>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {lessonDetail.course.title}
                          {typeof lessonDetail.progress?.viewCount === "number" && lessonDetail.progress.viewCount > 0 && (
                            <>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Visto {lessonDetail.progress.viewCount}{" "}
                                {lessonDetail.progress.viewCount === 1 ? "vez" : "veces"}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {lessonDetail.progress?.completedAt ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-4 w-4" />
                              Completada
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                !uncompleteM.isPending && !completeM.isPending && uncompleteM.mutate(lessonId)
                              }
                              disabled={uncompleteM.isPending || completeM.isPending}
                            >
                              {uncompleteM.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Desmarcar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="default"
                            className="h-10 gap-2 rounded-lg px-4 font-semibold shadow-sm"
                            onClick={() =>
                              !completeM.isPending && !uncompleteM.isPending && completeM.mutate(lessonId)
                            }
                            disabled={completeM.isPending || uncompleteM.isPending}
                          >
                            {completeM.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Marcar como completada
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tabs: Contenido / Recursos */}
                    <div className="flex items-center gap-1 border-b border-card-border px-3 py-2 sm:px-4">
                      <button
                        type="button"
                        onClick={() => setActiveTab("content")}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                          activeTab === "content"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        Descripción
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("resources")}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                          activeTab === "resources"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                        Información
                      </button>
                    </div>

                    <CardContent className="p-5 sm:p-6 md:p-7">
                      {activeTab === "content" ? (
                        <div
                          className={cn(
                            "prose prose-sm w-full min-w-0 max-w-[70ch] text-pretty dark:prose-invert",
                            "prose-headings:font-semibold prose-headings:tracking-tight",
                            "prose-p:leading-relaxed prose-p:text-foreground/85",
                            "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                            "prose-strong:text-foreground",
                            "whitespace-pre-wrap lg:prose-base xl:max-w-[72ch]",
                          )}
                        >
                          {lessonDetail.lesson.body || (
                            <p className="text-muted-foreground">
                              Esta lección no tiene descripción de texto. Reproducí el video para avanzar.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-card-border bg-muted/40 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <LayoutList className="h-4 w-4 text-primary" />
                              Tu avance en el curso
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {courseProgress.completed} de {courseProgress.total} lecciones completadas
                            </p>
                            <div className="mt-3">
                              <Progress value={courseProgress.percent} className="h-2" />
                              <p className="mt-1 text-right text-xs font-semibold tabular-nums text-primary">
                                {courseProgress.percent}%
                              </p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-card-border bg-muted/40 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Award className="h-4 w-4 text-[hsl(44_54%_45%)]" />
                              Consejo
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              Marcá la lección como completada cuando termines. Tu progreso se sincroniza en todos los
                              dispositivos.
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>

                    {/* Footer con navegación Anterior / Siguiente */}
                    {(prevLesson || nextLesson) && (
                      <div className="flex flex-col gap-2 border-t border-card-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          {prevLesson ? (
                            <Button
                              variant="ghost"
                              className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-background"
                              asChild
                            >
                              <Link href={`/tutoriales/curso/${courseId}/leccion/${prevLesson.id}`}>
                                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="min-w-0">
                                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Anterior
                                  </span>
                                  <span className="line-clamp-1 text-sm font-medium text-foreground">
                                    {prevLesson.title}
                                  </span>
                                </span>
                              </Link>
                            </Button>
                          ) : (
                            <div />
                          )}
                        </div>
                        <div className="flex-1">
                          {nextLesson ? (
                            <Button
                              className="h-auto w-full justify-end gap-3 rounded-lg px-3 py-2 text-right"
                              asChild
                            >
                              <Link href={`/tutoriales/curso/${courseId}/leccion/${nextLesson.id}`}>
                                <span className="min-w-0">
                                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/80">
                                    Siguiente
                                  </span>
                                  <span className="line-clamp-1 text-sm font-semibold">{nextLesson.title}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0" />
                              </Link>
                            </Button>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </>
              )
            ) : null}
          </main>

          {/* Sidebar: Temario del curso (izquierda en desktop) */}
          <aside className="min-w-0 lg:sticky lg:top-14 lg:z-[1] lg:order-1 lg:max-h-[calc(100dvh-4rem)] lg:self-start xl:top-16">
            {/* Móvil: carrusel horizontal */}
            <div className="space-y-3 lg:hidden">
              <Card className="overflow-hidden border-card-border bg-card shadow-sm">
                <CourseThumb index={0} progressPercent={courseProgress.percent} />
                <CardContent className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {courseDetail.course.title}
                    </h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {courseProgress.completed} de {courseProgress.total} lecciones
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                      <span>Progreso</span>
                      <span className="tabular-nums text-primary">{courseProgress.percent}%</span>
                    </div>
                    <Progress value={courseProgress.percent} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
              {totalLessons > 0 && (
                <>
                  <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contenido del curso
                  </p>
                  <div className="-mx-0.5 flex touch-pan-x snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
                    {courseDetail.lessons.map((l, idx) => {
                      const done = !!l.progress?.completedAt;
                      const active = lessonId === l.id;
                      return (
                        <Link
                          key={l.id}
                          href={`/tutoriales/curso/${courseId}/leccion/${l.id}`}
                          className="shrink-0"
                        >
                          <LessonChip index={idx} title={l.title} done={done} active={active} />
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Desktop: panel completo de temario */}
            <Card className="hidden overflow-hidden border-card-border bg-card shadow-sm lg:flex lg:max-h-[calc(100dvh-4rem)] lg:flex-col">
              <CourseThumb index={0} progressPercent={courseProgress.percent} />
              <div className="border-b border-card-border p-5">
                <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {courseDetail.course.title}
                </h2>
                {courseDetail.course.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {courseDetail.course.description}
                  </p>
                )}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-muted-foreground">Progreso del curso</span>
                    <span className="tabular-nums text-primary">{courseProgress.percent}%</span>
                  </div>
                  <Progress value={courseProgress.percent} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground">
                    {courseProgress.completed} de {courseProgress.total}{" "}
                    {courseProgress.total === 1 ? "lección completada" : "lecciones completadas"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Temario
                </p>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {totalLessons} {totalLessons === 1 ? "lección" : "lecciones"}
                </span>
              </div>

              <ScrollArea className="flex-1 px-2 pb-3">
                <ul className="space-y-1 px-1 pb-2">
                  {courseDetail.lessons.map((l, idx) => {
                    const done = !!l.progress?.completedAt;
                    const active = lessonId === l.id;
                    return (
                      <li key={l.id}>
                        <Link href={`/tutoriales/curso/${courseId}/leccion/${l.id}`}>
                          <LessonRow
                            index={idx}
                            title={l.title}
                            done={done}
                            active={active}
                            hasVideo={!!l.videoUrl}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>

              {courseProgress.percent >= 100 && (
                <div className="flex items-center gap-2 border-t border-card-border bg-emerald-500/5 px-5 py-3">
                  <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    ¡Curso completado!
                  </p>
                </div>
              )}
            </Card>
          </aside>
        </div>
      </AcademySection>
    );
  }

  return null;
}
