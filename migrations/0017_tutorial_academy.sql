/* Academia: cursos, lecciones, progreso */
CREATE TABLE IF NOT EXISTS "tutorial_courses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_published" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tutorial_lessons" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" varchar NOT NULL REFERENCES "tutorial_courses"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "body" text NOT NULL DEFAULT '',
  "video_url" text,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "tutorial_lessons_course_idx" ON "tutorial_lessons" ("course_id");

CREATE TABLE IF NOT EXISTS "tutorial_lesson_progress" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lesson_id" varchar NOT NULL REFERENCES "tutorial_lessons"("id") ON DELETE CASCADE,
  "view_count" integer NOT NULL DEFAULT 0,
  "first_viewed_at" timestamp,
  "last_viewed_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "tutorial_progress_user_lesson" ON "tutorial_lesson_progress" ("user_id", "lesson_id");
CREATE INDEX IF NOT EXISTS "tutorial_progress_lesson_idx" ON "tutorial_lesson_progress" ("lesson_id");
CREATE INDEX IF NOT EXISTS "tutorial_progress_user_idx" ON "tutorial_lesson_progress" ("user_id");
