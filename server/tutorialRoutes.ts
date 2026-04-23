import type { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth, requireRole, requireRoles } from "./middleware";
import { asyncHandler } from "./utils/asyncHandler";
import { NotFoundError } from "./errors/AppError";
import type { User } from "@shared/schema";

const courseBody = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  displayOrder: z.number().int().min(0).max(99999).optional(),
  isPublished: z.boolean().optional(),
});

const lessonBody = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(300),
  body: z.string().max(100_000).default(""),
  videoUrl: z.string().max(2000).optional().nullable(),
  displayOrder: z.number().int().min(0).max(99999).optional(),
  isPublished: z.boolean().optional(),
});

const lessonUpdateBody = lessonBody.omit({ courseId: true }).partial().extend({
  courseId: z.string().uuid().optional(),
});

export function registerTutorialRoutes(app: Express) {
  const tutorAccess = requireRoles(["advisor", "super_admin"]);

  app.get(
    "/api/tutorials/courses",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const list = await storage.listPublishedTutorialCoursesForUser(user.id);
      const withPct = list.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        displayOrder: c.displayOrder,
        createdAt: c.createdAt,
        publishedLessonCount: c.publishedLessonCount,
        completedLessonCount: c.completedLessonCount,
        progressPercent:
          c.publishedLessonCount > 0
            ? Math.round((c.completedLessonCount / c.publishedLessonCount) * 100)
            : 0,
      }));
      res.setHeader("Cache-Control", "private, no-store");
      res.json(withPct);
    })
  );

  app.get(
    "/api/tutorials/courses/:courseId",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const data = await storage.getPublishedCourseWithLessonsForUser(req.params.courseId, user.id);
      if (!data) throw new NotFoundError("Curso");
      res.setHeader("Cache-Control", "private, no-store");
      res.json(data);
    })
  );

  app.get(
    "/api/tutorials/lessons/:lessonId",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const data = await storage.getPublishedLessonForUser(req.params.lessonId, user.id);
      if (!data) throw new NotFoundError("Lección");
      res.setHeader("Cache-Control", "private, no-store");
      res.json(data);
    })
  );

  app.post(
    "/api/tutorials/lessons/:lessonId/view",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const pre = await storage.getPublishedLessonForUser(req.params.lessonId, user.id);
      if (!pre) throw new NotFoundError("Lección");
      const row = await storage.recordTutorialLessonView(user.id, req.params.lessonId);
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ progress: row });
    })
  );

  app.post(
    "/api/tutorials/lessons/:lessonId/complete",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const pre = await storage.getPublishedLessonForUser(req.params.lessonId, user.id);
      if (!pre) throw new NotFoundError("Lección");
      const row = await storage.completeTutorialLesson(user.id, req.params.lessonId);
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ progress: row });
    })
  );

  app.post(
    "/api/tutorials/lessons/:lessonId/uncomplete",
    requireAuth,
    tutorAccess,
    asyncHandler(async (req, res) => {
      const user = req.user as User;
      const pre = await storage.getPublishedLessonForUser(req.params.lessonId, user.id);
      if (!pre) throw new NotFoundError("Lección");
      const row = await storage.uncompleteTutorialLesson(user.id, req.params.lessonId);
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ progress: row });
    })
  );

  // ——— Admin ———

  app.get(
    "/api/admin/tutorial-courses",
    requireRole("super_admin"),
    asyncHandler(async (_req, res) => {
      const courses = await storage.listTutorialCoursesAdmin();
      const withCounts = await Promise.all(
        courses.map(async (c) => {
          const lessons = await storage.listTutorialLessonsByCourse(c.id);
          return { ...c, lessonCount: lessons.length };
        })
      );
      res.setHeader("Cache-Control", "private, no-store");
      res.json(withCounts);
    })
  );

  app.get(
    "/api/admin/tutorial-courses/:id/detail",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const c = await storage.getTutorialCourse(req.params.id);
      if (!c) throw new NotFoundError("Curso");
      const lessons = await storage.listTutorialLessonsByCourse(c.id);
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ ...c, lessons });
    })
  );

  app.post(
    "/api/admin/tutorial-courses",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const body = courseBody.parse(req.body);
      const course = await storage.createTutorialCourse({
        title: body.title,
        description: body.description ?? null,
        displayOrder: body.displayOrder ?? 0,
        isPublished: body.isPublished ?? false,
      });
      res.status(201).setHeader("Cache-Control", "private, no-store").json(course);
    })
  );

  app.put(
    "/api/admin/tutorial-courses/:id",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const body = courseBody.partial().parse(req.body);
      const course = await storage.updateTutorialCourse(req.params.id, {
        ...(body.title != null && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.displayOrder != null && { displayOrder: body.displayOrder }),
        ...(body.isPublished != null && { isPublished: body.isPublished }),
      });
      res.setHeader("Cache-Control", "private, no-store").json(course);
    })
  );

  app.delete(
    "/api/admin/tutorial-courses/:id",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      await storage.deleteTutorialCourse(req.params.id);
      res.json({ ok: true });
    })
  );

  app.get(
    "/api/admin/tutorial-courses/:courseId/lessons",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const lessons = await storage.listTutorialLessonsByCourse(req.params.courseId);
      res.setHeader("Cache-Control", "private, no-store").json(lessons);
    })
  );

  app.post(
    "/api/admin/tutorial-lessons",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const body = lessonBody.parse(req.body);
      const lesson = await storage.createTutorialLesson({
        courseId: body.courseId,
        title: body.title,
        body: body.body ?? "",
        videoUrl: body.videoUrl?.trim() || null,
        displayOrder: body.displayOrder ?? 0,
        isPublished: body.isPublished ?? true,
      });
      res.status(201).setHeader("Cache-Control", "private, no-store").json(lesson);
    })
  );

  app.put(
    "/api/admin/tutorial-lessons/:id",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      const body = lessonUpdateBody.parse(req.body);
      const current = await storage.getTutorialLesson(req.params.id);
      if (!current) throw new NotFoundError("Lección");
      const lesson = await storage.updateTutorialLesson(req.params.id, {
        ...(body.courseId != null && { courseId: body.courseId }),
        ...(body.title != null && { title: body.title }),
        ...(body.body !== undefined && { body: body.body }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl?.trim() || null }),
        ...(body.displayOrder != null && { displayOrder: body.displayOrder }),
        ...(body.isPublished != null && { isPublished: body.isPublished }),
      });
      res.setHeader("Cache-Control", "private, no-store").json(lesson);
    })
  );

  app.delete(
    "/api/admin/tutorial-lessons/:id",
    requireRole("super_admin"),
    asyncHandler(async (req, res) => {
      await storage.deleteTutorialLesson(req.params.id);
      res.json({ ok: true });
    })
  );

  app.get(
    "/api/admin/tutorials/analytics",
    requireRole("super_admin"),
    asyncHandler(async (_req, res) => {
      const data = await storage.getTutorialAnalytics();
      res.setHeader("Cache-Control", "private, no-store");
      res.json(data);
    })
  );
}
