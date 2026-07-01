import { pgTable, varchar, json, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

export const eventCategories = ["transport", "accommodation", "activity", "food", "other"] as const;
export type EventCategory = (typeof eventCategories)[number];

export interface EventWithCategory {
  text: string;
  category?: EventCategory;
}

export interface DayDetails {
  event?: EventWithCategory;
}

/** Itinerario de 25 días del contador de herramientas (por usuario). */
export const toolItineraries = pgTable("tool_itineraries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  days: json("days").$type<Record<string, DayDetails>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertToolItinerarySchema = createInsertSchema(toolItineraries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const eventWithCategorySchema = z.object({
  text: z.string().min(1, "El evento no puede estar vacío"),
  category: z.enum(eventCategories).optional(),
});

export const dayDetailsSchema = z.object({
  event: eventWithCategorySchema.optional(),
});

export const toolItinerarySchema = z.object({
  startDate: z.string(),
  days: z.record(z.string(), dayDetailsSchema),
});

export type InsertToolItinerary = z.infer<typeof insertToolItinerarySchema>;
export type ToolItinerary = z.infer<typeof toolItinerarySchema>;
export type SelectToolItinerary = typeof toolItineraries.$inferSelect;

export const DAYS_IN_TRIP = 25;
export const NIGHTS_IN_TRIP = 24;

export const categoryMetadata: Record<EventCategory, { icon: string; color: string; label: string }> = {
  transport: {
    icon: "🚗",
    color: "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400",
    label: "Transporte",
  },
  accommodation: {
    icon: "🏨",
    color: "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400",
    label: "Alojamiento",
  },
  activity: {
    icon: "🎯",
    color: "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400",
    label: "Actividad",
  },
  food: {
    icon: "🍽️",
    color: "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400",
    label: "Comida",
  },
  other: {
    icon: "📋",
    color: "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400",
    label: "Otro",
  },
};
