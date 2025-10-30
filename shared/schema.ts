import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const destinations = pgTable(
  "destinations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    country: text("country").notNull(),
    duration: integer("duration").notNull(),
    nights: integer("nights").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }),
    category: text("category").default("internacional"),
    isPromotion: boolean("is_promotion").default(false),
    displayOrder: integer("display_order").default(999),
    isActive: boolean("is_active").default(true),
    requiresTuesday: boolean("requires_tuesday").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [uniqueIndex("destinations_name_country_unique").on(table.name, table.country)],
);

export const insertDestinationSchema = createInsertSchema(destinations).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export const itineraryDays = pgTable("itinerary_days", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  location: text("location"),
  description: text("description").notNull(),
  activities: text("activities").array(),
  meals: text("meals").array(),
  accommodation: text("accommodation"),
});

export const insertItineraryDaySchema = createInsertSchema(itineraryDays).omit({ 
  id: true 
});
export type InsertItineraryDay = z.infer<typeof insertItineraryDaySchema>;
export type ItineraryDay = typeof itineraryDays.$inferSelect;

export const hotels = pgTable("hotels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  location: text("location"),
  imageUrl: text("image_url"),
  nights: integer("nights"),
});

export const insertHotelSchema = createInsertSchema(hotels).omit({ 
  id: true 
});
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotels.$inferSelect;

export const inclusions = pgTable("inclusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  displayOrder: integer("display_order").default(0),
});

export const insertInclusionSchema = createInsertSchema(inclusions).omit({ 
  id: true 
});
export type InsertInclusion = z.infer<typeof insertInclusionSchema>;
export type Inclusion = typeof inclusions.$inferSelect;

export const exclusions = pgTable("exclusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  displayOrder: integer("display_order").default(0),
});

export const insertExclusionSchema = createInsertSchema(exclusions).omit({ 
  id: true 
});
export type InsertExclusion = z.infer<typeof insertExclusionSchema>;
export type Exclusion = typeof exclusions.$inferSelect;
