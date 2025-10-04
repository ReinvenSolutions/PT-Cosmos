import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  country: text("country").notNull(),
  duration: integer("duration").notNull(),
  nights: integer("nights").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").default(999),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

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

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  travelStartDate: timestamp("travel_start_date"),
  travelEndDate: timestamp("travel_end_date"),
  adults: integer("adults").default(2),
  children: integer("children").default(0),
  status: text("status").default("draft"),
  notes: text("notes"),
  flightImageUrl: text("flight_image_url"),
  customItinerary: json("custom_itinerary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ 
  id: true,
  userId: true,
  createdAt: true, 
  updatedAt: true 
}).extend({
  totalPrice: z.string().or(z.number()),
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const quoteDestinations = pgTable("quote_destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").default(0),
  customPrice: decimal("custom_price", { precision: 10, scale: 2 }),
  customDuration: integer("custom_duration"),
});

export const insertQuoteDestinationSchema = createInsertSchema(quoteDestinations).omit({ 
  id: true 
}).extend({
  customPrice: z.string().or(z.number()).optional(),
});
export type InsertQuoteDestination = z.infer<typeof insertQuoteDestinationSchema>;
export type QuoteDestination = typeof quoteDestinations.$inferSelect;
