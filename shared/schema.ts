import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, uniqueIndex, json } from "drizzle-orm/pg-core";
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
    allowedDays: text("allowed_days").array(),
    priceTiers: json("price_tiers").$type<Array<{ endDate: string; price: string }>>(),
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

export const destinationImages = pgTable("destination_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDestinationImageSchema = createInsertSchema(destinationImages).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDestinationImage = z.infer<typeof insertDestinationImageSchema>;
export type DestinationImage = typeof destinationImages.$inferSelect;

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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  originCity: text("origin_city"),
  flightsAndExtras: decimal("flights_and_extras", { precision: 10, scale: 2 }),
  outboundFlightImages: text("outbound_flight_images").array(),
  returnFlightImages: text("return_flight_images").array(),
  domesticFlightImages: text("domestic_flight_images").array(),
  includeFlights: boolean("include_flights").default(false),
  outboundCabinBaggage: boolean("outbound_cabin_baggage").default(false),
  outboundHoldBaggage: boolean("outbound_hold_baggage").default(false),
  returnCabinBaggage: boolean("return_cabin_baggage").default(false),
  returnHoldBaggage: boolean("return_hold_baggage").default(false),
  domesticCabinBaggage: boolean("domestic_cabin_baggage").default(false),
  domesticHoldBaggage: boolean("domestic_hold_baggage").default(false),
  turkeyUpgrade: text("turkey_upgrade"),
  trm: decimal("trm", { precision: 10, scale: 2 }),
  customFilename: text("custom_filename"),
  minPayment: decimal("min_payment", { precision: 10, scale: 2 }),
  minPaymentCOP: decimal("min_payment_cop", { precision: 15, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  finalPriceCOP: decimal("final_price_cop", { precision: 15, scale: 2 }),
  finalPriceCurrency: text("final_price_currency").default("USD"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const quoteDestinations = pgTable("quote_destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id),
  startDate: timestamp("start_date").notNull(),
  passengers: integer("passengers").notNull().default(2),
  price: decimal("price", { precision: 10, scale: 2 }),
});

export const insertQuoteDestinationSchema = createInsertSchema(quoteDestinations).omit({ 
  id: true 
});
export type InsertQuoteDestination = z.infer<typeof insertQuoteDestinationSchema>;
export type QuoteDestination = typeof quoteDestinations.$inferSelect;

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export function formatUSD(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
