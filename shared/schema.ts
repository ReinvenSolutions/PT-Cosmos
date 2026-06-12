import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, uniqueIndex, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { QuoteFeesConfig } from "./quoteFees";
import type { PlanTax } from "./planTaxes";

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
    /** Plan “bloqueo”: pestaña Bloqueos, salida fija, cupos limitados, precio fijo en base_price. */
    isBloqueo: boolean("is_bloqueo").default(false),
    /** Fecha de salida fija (YYYY-MM-DD). No editable en admin una vez definida. */
    bloqueoSalidaFecha: text("bloqueo_salida_fecha"),
    /** Cupos restantes; al guardar cotización se descuenta por pasajeros; el admin puede ajustar manualmente. */
    bloqueoCuposDisponibles: integer("bloqueo_cupos_disponibles"),
    displayOrder: integer("display_order").default(999),
    isActive: boolean("is_active").default(true),
    requiresTuesday: boolean("requires_tuesday").default(false),
    requiresExtraDay: boolean("requires_extra_day").default(false),
    allowedDays: text("allowed_days").array(),
    priceTiers: json("price_tiers").$type<Array<{ startDate?: string; endDate: string; price: string; isFlightDay?: boolean; flightLabel?: string }>>(),
    upgrades: json("upgrades").$type<Array<{ code: string; name: string; description?: string; price: number }>>(),
    /** Impuestos fijos del plan (se suman al PVP en cotización). */
    planTaxes: json("plan_taxes").$type<PlanTax[] | null>(),
    hasInternalOrConnectionFlight: boolean("has_internal_or_connection_flight").default(false),
    internalFlights: json("internal_flights").$type<
      Array<{
        imageUrl: string;
        label?: string;
        cabinBaggage?: boolean;
        holdBaggage?: boolean;
        /** Ida, regreso o conexión/interno (planes bloqueo en cotización/PDF). */
        flightRole?: "outbound" | "return" | "domestic";
      }>
    >(),
    medicalAssistanceInfo: text("medical_assistance_info"),
    medicalAssistanceImageUrl: text("medical_assistance_image_url"),
    firstPageComments: text("first_page_comments"),
    cardTooltip: text("card_tooltip"),
    itineraryMapImageUrl: text("itinerary_map_image_url"),
    /** URL pública del audio descriptivo del programa (MP3), p. ej. Supabase plan-{slug}/audio/… */
    descriptiveAudioUrl: text("descriptive_audio_url"),
    /** URLs ordenadas de la galería solo-hoteles (bucket Supabase plan-{slug}-hotels por plan) */
    hotelGalleryImageUrls: text("hotel_gallery_image_urls").array(),
    /** URLs ordenadas de la galería Adicionales (bucket plan-{slug}-adicionales; mismo PDF que hoteles) */
    adicionalesGalleryImageUrls: text("adicionales_gallery_image_urls").array(),
    flightTerms: text("flight_terms"),
    termsConditions: text("terms_conditions"),
    /** Recomendaciones y notas adicionales; se imprimen al final del PDF del plan. */
    recommendations: text("recommendations"),
    /** Usuario agencia que creó el plan; null = plan de Cosmos / super admin. */
    createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Nombre visible de la agencia en tarjetas del catálogo (snapshot al crear el plan). */
    agencyDisplayName: text("agency_display_name"),
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
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  /** approved | pending | denied — los registros públicos quedan en pending hasta que un super_admin apruebe */
  approvalStatus: text("approval_status").default("approved").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(true),
  /** Descuento % sobre porción terrestre en cotizaciones (solo asesores/agencias; asignado por super_admin) */
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const twoFactorSessions = pgTable("two_factor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
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
  connectionFlightImages: text("connection_flight_images").array(),
  connectionCabinBaggage: boolean("connection_cabin_baggage").default(false),
  connectionHoldBaggage: boolean("connection_hold_baggage").default(false),
  connectionFlightSegments: json("connection_flight_segments").$type<Array<{ images: string[] }>>(),
  turkeyUpgrade: text("turkey_upgrade"),
  italiaUpgrade: text("italia_upgrade"),
  granTourUpgrade: text("gran_tour_upgrade"),
  selectedUpgrades: json("selected_upgrades").$type<Record<string, string>>(),
  trm: decimal("trm", { precision: 10, scale: 2 }),
  customFilename: text("custom_filename"),
  minPayment: decimal("min_payment", { precision: 10, scale: 2 }),
  minPaymentCOP: decimal("min_payment_cop", { precision: 15, scale: 2 }),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  finalPriceCOP: decimal("final_price_cop", { precision: 15, scale: 2 }),
  finalPriceCurrency: text("final_price_currency").default("USD"),
  taxesAndFees: json("taxes_and_fees").$type<QuoteFeesConfig | null>(),
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

export const quoteLogs = pgTable("quote_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  destinationId: varchar("destination_id").references(() => destinations.id),
  passengers: integer("passengers"),
  startDate: timestamp("start_date"),
  isSaved: boolean("is_saved").default(false),
  metadata: json("metadata").$type<{
    planName?: string;
    originCity?: string;
    includeFlights?: boolean;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteLogSchema = createInsertSchema(quoteLogs).omit({
  id: true,
  createdAt: true
});
export type InsertQuoteLog = z.infer<typeof insertQuoteLogSchema>;
export type QuoteLog = typeof quoteLogs.$inferSelect;

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const termsConditions = pgTable("terms_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  scope: text("scope").notNull().default("plan"),
  destinationId: varchar("destination_id").references(() => destinations.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTermsConditionsSchema = createInsertSchema(termsConditions).omit({
  id: true,
  createdAt: true
});
export type InsertTermsConditions = z.infer<typeof insertTermsConditionsSchema>;
export type TermsConditions = typeof termsConditions.$inferSelect;

/** Cursos de la academia / tutoriales (admin edita, usuarios avanzan con progreso). */
export const tutorialCourses = pgTable("tutorial_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTutorialCourseSchema = createInsertSchema(tutorialCourses).omit({
  id: true,
  createdAt: true
});
export type InsertTutorialCourse = z.infer<typeof insertTutorialCourseSchema>;
export type TutorialCourse = typeof tutorialCourses.$inferSelect;

export const tutorialLessons = pgTable("tutorial_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id")
    .notNull()
    .references(() => tutorialCourses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  videoUrl: text("video_url"),
  displayOrder: integer("display_order").default(0).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [index("tutorial_lessons_course_idx").on(t.courseId)]);

export const insertTutorialLessonSchema = createInsertSchema(tutorialLessons).omit({
  id: true,
  createdAt: true
});
export type InsertTutorialLesson = z.infer<typeof insertTutorialLessonSchema>;
export type TutorialLesson = typeof tutorialLessons.$inferSelect;

export const tutorialLessonProgress = pgTable("tutorial_lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: varchar("lesson_id")
    .notNull()
    .references(() => tutorialLessons.id, { onDelete: "cascade" }),
  viewCount: integer("view_count").default(0).notNull(),
  firstViewedAt: timestamp("first_viewed_at"),
  lastViewedAt: timestamp("last_viewed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  uniqueIndex("tutorial_progress_user_lesson").on(t.userId, t.lessonId),
  index("tutorial_progress_lesson_idx").on(t.lessonId),
  index("tutorial_progress_user_idx").on(t.userId),
]);

export const insertTutorialLessonProgressSchema = createInsertSchema(tutorialLessonProgress).omit({
  id: true,
  createdAt: true
});
export type InsertTutorialLessonProgress = z.infer<typeof insertTutorialLessonProgressSchema>;
export type TutorialLessonProgress = typeof tutorialLessonProgress.$inferSelect;

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
