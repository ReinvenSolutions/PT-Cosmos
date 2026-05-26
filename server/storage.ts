import {
  destinations,
  itineraryDays,
  hotels,
  inclusions,
  exclusions,
  users,
  clients,
  quotes,
  quoteDestinations,
  passwordResetTokens,
  twoFactorSessions,
  type Destination,
  type InsertDestination,
  type ItineraryDay,
  type InsertItineraryDay,
  type Hotel,
  type InsertHotel,
  type Inclusion,
  type InsertInclusion,
  type Exclusion,
  type InsertExclusion,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Quote,
  type InsertQuote,
  type QuoteDestination,
  type InsertQuoteDestination,
  destinationImages,
  type DestinationImage,
  quoteLogs,
  type QuoteLog,
  type InsertQuoteLog,
  appSettings,
  tutorialCourses,
  tutorialLessons,
  tutorialLessonProgress,
  type TutorialCourse,
  type InsertTutorialCourse,
  type TutorialLesson,
  type InsertTutorialLesson,
  type TutorialLessonProgress,
} from "@shared/schema";
import { GLOBAL_TRM_BASE_SETTING_KEY } from "@shared/trm";
import { db } from "./db";
import { eq, or, sql, desc, asc, count, inArray, and } from "drizzle-orm";
import { applyBloqueoCuposForQuoteChange } from "./bloqueoCupos";

function parseGlobalTrmBase(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
import { logger } from "./logger";
import { ValidationError } from "./errors/AppError";

export interface IStorage {
  getDestinations(params?: { isActive?: boolean; createdByUserId?: string }): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  getDestinationsWithPreviews(params?: { isActive?: boolean }): Promise<Array<Destination & { hotels: Hotel[]; itinerary: ItineraryDay[] }>>;
  createDestination(data: InsertDestination): Promise<Destination>;
  updateDestination(id: string, data: Partial<InsertDestination>): Promise<Destination>;
  deleteDestination(id: string): Promise<void>;
  countQuotesByDestination(destinationId: string): Promise<number>;

  getItineraryDays(destinationId: string): Promise<ItineraryDay[]>;
  replaceItineraryDays(destinationId: string, days: Omit<InsertItineraryDay, "destinationId">[]): Promise<void>;

  getHotels(destinationId: string): Promise<Hotel[]>;
  replaceHotels(destinationId: string, hotelsData: Omit<InsertHotel, "destinationId">[]): Promise<void>;

  getInclusions(destinationId: string): Promise<Inclusion[]>;
  replaceInclusions(destinationId: string, items: Omit<InsertInclusion, "destinationId">[]): Promise<void>;

  getExclusions(destinationId: string): Promise<Exclusion[]>;
  replaceExclusions(destinationId: string, items: Omit<InsertExclusion, "destinationId">[]): Promise<void>;

  getDestinationImages(destinationId: string): Promise<DestinationImage[]>;
  replaceDestinationImages(destinationId: string, images: Omit<{ imageUrl: string; displayOrder?: number }, "destinationId">[]): Promise<void>;

  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "name" | "avatarUrl">>): Promise<User>;
  listUsers(): Promise<Omit<User, "passwordHash">[]>;
  updateUserByAdmin(id: string, data: Partial<{ name: string; username: string; email: string | null; role: string; isActive: boolean; approvalStatus: string; passwordHash: string; twoFactorEnabled: boolean }>): Promise<User>;
  countPendingApprovalUsers(): Promise<number>;
  deleteUser(id: string): Promise<void>;
  countQuotesByUser(userId: string): Promise<number>;
  findUserByUsername(username: string): Promise<User | undefined>;
  findUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  findUserById(id: string): Promise<User | undefined>;
  findSuperAdmins(): Promise<Pick<User, "email" | "username">[]>;

  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  consumePasswordResetToken(token: string): Promise<{ userId: string } | null>;
  createTwoFactorSession(userId: string, code: string, expiresAt: Date): Promise<string>;
  verifyTwoFactorSession(sessionId: string, code: string): Promise<User | null>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;

  createClient(data: InsertClient): Promise<Client>;
  listClients(): Promise<Client[]>;
  findClientById(id: string): Promise<Client | undefined>;

  createQuote(quoteData: InsertQuote, destinationsData: InsertQuoteDestination[]): Promise<Quote>;
  updateQuote(id: string, userId: string, quoteData: Partial<InsertQuote>, destinationsData: InsertQuoteDestination[]): Promise<Quote>;
  listQuotesByUser(userId: string): Promise<(Quote & { client: Client })[]>;
  listAllQuotes(): Promise<(Quote & { client: Client, user: User })[]>;
  getQuote(id: string, userId?: string): Promise<(Quote & { client: Client, destinations: (QuoteDestination & { destination: Destination })[] }) | undefined>;
  getQuoteStats(): Promise<{ userId: string, username: string, count: number, amount: number }[]>;
  deleteQuote(id: string, userId: string): Promise<void>;

  // New Analytics methods
  createQuoteLog(data: InsertQuoteLog): Promise<QuoteLog>;
  getDashboardMetrics(): Promise<{
    totalQuotes: number;
    totalAmountUSD: number;
    totalClients: number;
    totalUsers: number;
    quotesThisMonth: number;
    quotesThisWeek: number;
    totalActivePlans: number;
    savedQuotesCount: number;
    savedQuotesAmount: number;
    ticketPromedio: number;
    newClientsThisMonth: number;
    quotesLastMonth: number;
    quotesLastWeek: number;
    amountThisMonth: number;
    amountThisWeek: number;
    amountLastMonth: number;
    amountLastWeek: number;
  }>;
  getRecentQuotes(limit?: number): Promise<(Quote & { client: Client, user: User, destinations: { destination: { name: string } }[] })[]>;
  getTopDestinations(limit?: number): Promise<{ destinationId: string; destinationName: string; count: number }[]>;
  getTopDestinationsByAmount(limit?: number): Promise<{ destinationId: string; destinationName: string; amount: number }[]>;
  getQuotesByDateRange(days: number): Promise<{ date: string, count: number, amount: number }[]>;
  getQuotesByClient(clientId: string): Promise<Quote[]>;

  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;
  getGlobalTrmBase(): Promise<number | null>;
  setGlobalTrmBase(baseTrm: number | null): Promise<void>;

  getTutorialCourse(id: string): Promise<TutorialCourse | undefined>;
  listTutorialCoursesAdmin(): Promise<TutorialCourse[]>;
  createTutorialCourse(data: InsertTutorialCourse): Promise<TutorialCourse>;
  updateTutorialCourse(id: string, data: Partial<InsertTutorialCourse>): Promise<TutorialCourse>;
  deleteTutorialCourse(id: string): Promise<void>;
  listTutorialLessonsByCourse(courseId: string): Promise<TutorialLesson[]>;
  getTutorialLesson(id: string): Promise<TutorialLesson | undefined>;
  createTutorialLesson(data: InsertTutorialLesson): Promise<TutorialLesson>;
  updateTutorialLesson(id: string, data: Partial<InsertTutorialLesson>): Promise<TutorialLesson>;
  deleteTutorialLesson(id: string): Promise<void>;
  listPublishedTutorialCoursesForUser(userId: string): Promise<
    Array<TutorialCourse & { publishedLessonCount: number; completedLessonCount: number }>
  >;
  getPublishedCourseWithLessonsForUser(
    courseId: string,
    userId: string
  ): Promise<{
    course: TutorialCourse;
    lessons: Array<
      TutorialLesson & {
        progress: { viewCount: number; completedAt: Date | null; lastViewedAt: Date | null } | null;
      }
    >;
  } | null>;
  getPublishedLessonForUser(lessonId: string, userId: string): Promise<{
    lesson: TutorialLesson;
    course: TutorialCourse;
    progress: TutorialLessonProgress | null;
  } | null>;
  recordTutorialLessonView(userId: string, lessonId: string): Promise<TutorialLessonProgress>;
  completeTutorialLesson(userId: string, lessonId: string): Promise<TutorialLessonProgress>;
  uncompleteTutorialLesson(userId: string, lessonId: string): Promise<TutorialLessonProgress>;
  getTutorialAnalytics(): Promise<{
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
  }>;
}

export class DatabaseStorage implements IStorage {
  async getDestinations(params?: { isActive?: boolean; createdByUserId?: string }): Promise<Destination[]> {
    const filters = [];
    if (params?.isActive !== undefined) {
      filters.push(eq(destinations.isActive, params.isActive));
    }
    if (params?.createdByUserId) {
      filters.push(eq(destinations.createdByUserId, params.createdByUserId));
    }
    if (filters.length === 1) {
      return db
        .select()
        .from(destinations)
        .where(filters[0])
        .orderBy(destinations.displayOrder, destinations.name);
    }
    if (filters.length > 1) {
      return db
        .select()
        .from(destinations)
        .where(and(...filters))
        .orderBy(destinations.displayOrder, destinations.name);
    }
    return db
      .select()
      .from(destinations)
      .orderBy(destinations.displayOrder, destinations.name);
  }

  async getDestination(id: string): Promise<Destination | undefined> {
    const result = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id))
      .limit(1);
    return result[0];
  }

  /** Destinos activos con hoteles e itinerario en una sola operación (evita N+1 requests) */
  async getDestinationsWithPreviews(params?: { isActive?: boolean }): Promise<
    Array<Destination & { hotels: Hotel[]; itinerary: ItineraryDay[] }>
  > {
    const dests = await this.getDestinations(params ?? { isActive: true });
    if (dests.length === 0) return [];

    const ids = dests.map((d) => d.id);
    const [allHotels, allItinerary] = await Promise.all([
      db.select().from(hotels).where(inArray(hotels.destinationId, ids)),
      db.select().from(itineraryDays).where(inArray(itineraryDays.destinationId, ids)).orderBy(itineraryDays.dayNumber),
    ]);

    const hotelsByDest = new Map<string, Hotel[]>();
    for (const h of allHotels) {
      const list = hotelsByDest.get(h.destinationId) ?? [];
      list.push(h);
      hotelsByDest.set(h.destinationId, list);
    }

    const itineraryByDest = new Map<string, ItineraryDay[]>();
    for (const d of allItinerary) {
      const list = itineraryByDest.get(d.destinationId) ?? [];
      list.push(d);
      itineraryByDest.set(d.destinationId, list);
    }

    return dests.map((dest) => ({
      ...dest,
      hotels: hotelsByDest.get(dest.id) ?? [],
      itinerary: itineraryByDest.get(dest.id) ?? [],
    }));
  }

  async getItineraryDays(destinationId: string): Promise<ItineraryDay[]> {
    const allDays = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.destinationId, destinationId))
      .orderBy(itineraryDays.dayNumber);

    // Remove duplicates: keep only the first occurrence of each dayNumber
    // This prevents duplicate itinerary days from appearing in PDFs
    const seenDays = new Map<number, ItineraryDay>();
    const uniqueDays: ItineraryDay[] = [];

    for (const day of allDays) {
      if (!seenDays.has(day.dayNumber)) {
        seenDays.set(day.dayNumber, day);
        uniqueDays.push(day);
      } else {
        // Log duplicate for debugging
        logger.warn("Duplicate itinerary day found", {
          destinationId,
          dayNumber: day.dayNumber,
          keptId: seenDays.get(day.dayNumber)?.id,
          duplicateId: day.id,
        });
      }
    }

    return uniqueDays;
  }

  async getHotels(destinationId: string): Promise<Hotel[]> {
    return db
      .select()
      .from(hotels)
      .where(eq(hotels.destinationId, destinationId));
  }

  async getInclusions(destinationId: string): Promise<Inclusion[]> {
    return db
      .select()
      .from(inclusions)
      .where(eq(inclusions.destinationId, destinationId))
      .orderBy(inclusions.displayOrder);
  }

  async getExclusions(destinationId: string): Promise<Exclusion[]> {
    return db
      .select()
      .from(exclusions)
      .where(eq(exclusions.destinationId, destinationId))
      .orderBy(exclusions.displayOrder);
  }

  async getDestinationImages(destinationId: string): Promise<DestinationImage[]> {
    return db
      .select()
      .from(destinationImages)
      .where(eq(destinationImages.destinationId, destinationId))
      .orderBy(destinationImages.displayOrder);
  }

  async createDestination(data: InsertDestination): Promise<Destination> {
    const result = await db.insert(destinations).values(data).returning();
    return result[0];
  }

  async updateDestination(id: string, data: Partial<InsertDestination>): Promise<Destination> {
    const result = await db
      .update(destinations)
      .set(data)
      .where(eq(destinations.id, id))
      .returning();
    return result[0];
  }

  async countQuotesByDestination(destinationId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(quoteDestinations)
      .where(eq(quoteDestinations.destinationId, destinationId));
    return Number(result[0]?.count ?? 0);
  }

  async deleteDestination(id: string): Promise<void> {
    const quoteCount = await this.countQuotesByDestination(id);
    if (quoteCount > 0) {
      throw new Error(`No se puede eliminar: este plan está referenciado en ${quoteCount} cotización(es). Desactívalo en su lugar.`);
    }
    await db.transaction(async (tx) => {
      // Poner destination_id = NULL en quote_logs para no violar la FK (preservamos el historial de logs)
      await tx.update(quoteLogs)
        .set({ destinationId: null })
        .where(eq(quoteLogs.destinationId, id));
      await tx.delete(destinationImages).where(eq(destinationImages.destinationId, id));
      await tx.delete(itineraryDays).where(eq(itineraryDays.destinationId, id));
      await tx.delete(hotels).where(eq(hotels.destinationId, id));
      await tx.delete(inclusions).where(eq(inclusions.destinationId, id));
      await tx.delete(exclusions).where(eq(exclusions.destinationId, id));
      await tx.delete(destinations).where(eq(destinations.id, id));
    });
  }

  async replaceItineraryDays(destinationId: string, days: Omit<InsertItineraryDay, "destinationId">[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
      if (days.length > 0) {
        await tx.insert(itineraryDays).values(days.map(d => ({ ...d, destinationId })));
      }
    });
  }

  async replaceHotels(destinationId: string, hotelsData: Omit<InsertHotel, "destinationId">[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(hotels).where(eq(hotels.destinationId, destinationId));
      if (hotelsData.length > 0) {
        await tx.insert(hotels).values(hotelsData.map(h => ({ ...h, destinationId })));
      }
    });
  }

  async replaceInclusions(destinationId: string, items: Omit<InsertInclusion, "destinationId">[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(inclusions).where(eq(inclusions.destinationId, destinationId));
      if (items.length > 0) {
        await tx.insert(inclusions).values(items.map((item, i) => ({ ...item, destinationId, displayOrder: item.displayOrder ?? i })));
      }
    });
  }

  async replaceExclusions(destinationId: string, items: Omit<InsertExclusion, "destinationId">[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(exclusions).where(eq(exclusions.destinationId, destinationId));
      if (items.length > 0) {
        await tx.insert(exclusions).values(items.map((item, i) => ({ ...item, destinationId, displayOrder: item.displayOrder ?? i })));
      }
    });
  }

  async replaceDestinationImages(destinationId: string, images: Omit<{ imageUrl: string; displayOrder?: number }, "destinationId">[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(destinationImages).where(eq(destinationImages.destinationId, destinationId));
      if (images.length > 0) {
        await tx.insert(destinationImages).values(images.map((img, i) => ({
          destinationId,
          imageUrl: img.imageUrl,
          displayOrder: img.displayOrder ?? i,
        })));
      }
    });
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "avatarUrl">>): Promise<User> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async listUsers(): Promise<Omit<User, "passwordHash">[]> {
    const result = await db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      approvalStatus: users.approvalStatus,
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
    return result;
  }

  async countPendingApprovalUsers(): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.approvalStatus, "pending"));
    return Number(result[0]?.count ?? 0);
  }

  async updateUserByAdmin(id: string, data: Partial<{ name: string; username: string; email: string | null; role: string; isActive: boolean; approvalStatus: string; passwordHash: string; twoFactorEnabled: boolean }>): Promise<User> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.username !== undefined) updates.username = data.username;
    if (data.email !== undefined) updates.email = data.email;
    if (data.role !== undefined) updates.role = data.role;
    if (data.isActive !== undefined) updates.isActive = data.isActive;
    if (data.approvalStatus !== undefined) updates.approvalStatus = data.approvalStatus;
    if (data.passwordHash !== undefined) updates.passwordHash = data.passwordHash;
    if (data.twoFactorEnabled !== undefined) updates.twoFactorEnabled = data.twoFactorEnabled;
    if (Object.keys(updates).length === 0) {
      const u = await this.findUserById(id);
      if (!u) throw new Error("Usuario no encontrado");
      return u;
    }
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async countQuotesByUser(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(quotes)
      .where(eq(quotes.userId, userId));
    return Number(result[0]?.count ?? 0);
  }

  async deleteUser(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await tx.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
      if (!existing[0]) {
        throw new ValidationError("Usuario no encontrado");
      }

      const userQuotes = await tx.select({ id: quotes.id }).from(quotes).where(eq(quotes.userId, id));
      const quoteIds = userQuotes.map((q) => q.id);
      if (quoteIds.length > 0) {
        await tx.delete(quoteDestinations).where(inArray(quoteDestinations.quoteId, quoteIds));
        await tx.delete(quotes).where(eq(quotes.userId, id));
      }

      await tx.delete(quoteLogs).where(eq(quoteLogs.userId, id));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
      await tx.delete(twoFactorSessions).where(eq(twoFactorSessions.userId, id));

      await tx.delete(users).where(eq(users.id, id));
    });
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async findUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)))
      .limit(1);
    return result[0];
  }

  async findUserById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async findSuperAdmins(): Promise<Pick<User, "email" | "username">[]> {
    const result = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(eq(users.role, "super_admin"));
    return result;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
    const rows = await db
      .select({ userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    const row = rows[0];
    if (!row || new Date(row.expiresAt) < new Date()) return null;
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return { userId: row.userId };
  }

  async createTwoFactorSession(userId: string, code: string, expiresAt: Date): Promise<string> {
    const result = await db.insert(twoFactorSessions).values({
      userId,
      code,
      expiresAt,
    }).returning({ id: twoFactorSessions.id });
    return result[0].id;
  }

  async verifyTwoFactorSession(sessionId: string, code: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(twoFactorSessions)
      .where(eq(twoFactorSessions.id, sessionId));
    const session = rows[0];
    if (!session || session.code !== code || new Date(session.expiresAt) < new Date()) {
      return null;
    }
    await db.delete(twoFactorSessions).where(eq(twoFactorSessions.id, sessionId));
    const user = await this.findUserById(session.userId);
    return user ?? null;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async createClient(data: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(data).returning();
    return result[0];
  }

  async listClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(clients.name);
  }

  async findClientById(id: string): Promise<Client | undefined> {
    const result = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    return result[0];
  }

  async createQuote(quoteData: InsertQuote, destinationsData: InsertQuoteDestination[]): Promise<Quote> {
    return await db.transaction(async (tx) => {
      await applyBloqueoCuposForQuoteChange(
        tx,
        [],
        destinationsData.map((d) => ({
          destinationId: d.destinationId,
          passengers: d.passengers ?? 1,
        })),
      );

      const [quote] = await tx.insert(quotes).values(quoteData).returning();

      if (destinationsData.length > 0) {
        const destinationsWithQuoteId = destinationsData.map(d => ({
          ...d,
          quoteId: quote.id,
          startDate: typeof d.startDate === 'string' ? new Date(d.startDate) : d.startDate,
        }));
        await tx.insert(quoteDestinations).values(destinationsWithQuoteId);
      }

      return quote;
    });
  }

  async updateQuote(id: string, userId: string, quoteData: Partial<InsertQuote>, destinationsData: InsertQuoteDestination[]): Promise<Quote> {
    return await db.transaction(async (tx) => {
      const existingQuote = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, id))
        .limit(1);

      if (!existingQuote[0] || existingQuote[0].userId !== userId) {
        throw new Error("Quote not found or unauthorized");
      }

      const previousDestRows = await tx
        .select({
          destinationId: quoteDestinations.destinationId,
          passengers: quoteDestinations.passengers,
        })
        .from(quoteDestinations)
        .where(eq(quoteDestinations.quoteId, id));

      await applyBloqueoCuposForQuoteChange(
        tx,
        previousDestRows,
        destinationsData.map((d) => ({
          destinationId: d.destinationId,
          passengers: d.passengers ?? 1,
        })),
      );

      const [updatedQuote] = await tx
        .update(quotes)
        .set({ ...quoteData, updatedAt: new Date() })
        .where(eq(quotes.id, id))
        .returning();

      await tx.delete(quoteDestinations).where(eq(quoteDestinations.quoteId, id));

      if (destinationsData.length > 0) {
        const destinationsWithQuoteId = destinationsData.map(d => ({
          ...d,
          quoteId: id,
          startDate: typeof d.startDate === 'string' ? new Date(d.startDate) : d.startDate,
        }));
        await tx.insert(quoteDestinations).values(destinationsWithQuoteId);
      }

      return updatedQuote;
    });
  }

  async listQuotesByUser(userId: string): Promise<(Quote & { client: Client })[]> {
    const result = await db
      .select({
        id: quotes.id,
        clientId: quotes.clientId,
        userId: quotes.userId,
        totalPrice: quotes.totalPrice,
        originCity: quotes.originCity,
        flightsAndExtras: quotes.flightsAndExtras,
        outboundFlightImages: quotes.outboundFlightImages,
        returnFlightImages: quotes.returnFlightImages,
        includeFlights: quotes.includeFlights,
        outboundCabinBaggage: quotes.outboundCabinBaggage,
        outboundHoldBaggage: quotes.outboundHoldBaggage,
        returnCabinBaggage: quotes.returnCabinBaggage,
        returnHoldBaggage: quotes.returnHoldBaggage,
        domesticCabinBaggage: quotes.domesticCabinBaggage,
        domesticHoldBaggage: quotes.domesticHoldBaggage,
        connectionFlightImages: quotes.connectionFlightImages,
        connectionCabinBaggage: quotes.connectionCabinBaggage,
        connectionHoldBaggage: quotes.connectionHoldBaggage,
        connectionFlightSegments: quotes.connectionFlightSegments,
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
        selectedUpgrades: quotes.selectedUpgrades,
        trm: quotes.trm,
        customFilename: quotes.customFilename,
        minPayment: quotes.minPayment,
        minPaymentCOP: quotes.minPaymentCOP,
        finalPrice: quotes.finalPrice,
        finalPriceCOP: quotes.finalPriceCOP,
        finalPriceCurrency: quotes.finalPriceCurrency,
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        domesticFlightImages: quotes.domesticFlightImages,
        client: clients,
      })
      .from(quotes)
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.createdAt));

    return result.map(r => ({
      id: r.id,
      clientId: r.clientId,
      userId: r.userId,
      totalPrice: r.totalPrice,
      originCity: r.originCity,
      flightsAndExtras: r.flightsAndExtras,
      outboundFlightImages: r.outboundFlightImages,
      returnFlightImages: r.returnFlightImages,
      includeFlights: r.includeFlights,
      outboundCabinBaggage: r.outboundCabinBaggage,
      outboundHoldBaggage: r.outboundHoldBaggage,
      returnCabinBaggage: r.returnCabinBaggage,
      returnHoldBaggage: r.returnHoldBaggage,
      domesticFlightImages: r.domesticFlightImages,
      domesticCabinBaggage: r.domesticCabinBaggage,
      domesticHoldBaggage: r.domesticHoldBaggage,
      connectionFlightImages: r.connectionFlightImages,
      connectionCabinBaggage: r.connectionCabinBaggage,
      connectionHoldBaggage: r.connectionHoldBaggage,
      connectionFlightSegments: r.connectionFlightSegments,
      turkeyUpgrade: r.turkeyUpgrade,
      italiaUpgrade: r.italiaUpgrade,
      granTourUpgrade: r.granTourUpgrade,
      selectedUpgrades: r.selectedUpgrades,
      trm: r.trm,
      customFilename: r.customFilename,
      minPayment: r.minPayment,
      minPaymentCOP: r.minPaymentCOP,
      finalPrice: r.finalPrice,
      finalPriceCOP: r.finalPriceCOP,
      finalPriceCurrency: r.finalPriceCurrency,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      client: r.client,
    }));
  }

  async listAllQuotes(): Promise<(Quote & { client: Client, user: User })[]> {
    const result = await db
      .select({
        id: quotes.id,
        clientId: quotes.clientId,
        userId: quotes.userId,
        totalPrice: quotes.totalPrice,
        originCity: quotes.originCity,
        flightsAndExtras: quotes.flightsAndExtras,
        outboundFlightImages: quotes.outboundFlightImages,
        returnFlightImages: quotes.returnFlightImages,
        includeFlights: quotes.includeFlights,
        outboundCabinBaggage: quotes.outboundCabinBaggage,
        outboundHoldBaggage: quotes.outboundHoldBaggage,
        returnCabinBaggage: quotes.returnCabinBaggage,
        returnHoldBaggage: quotes.returnHoldBaggage,
        domesticFlightImages: quotes.domesticFlightImages,
        domesticCabinBaggage: quotes.domesticCabinBaggage,
        domesticHoldBaggage: quotes.domesticHoldBaggage,
        connectionFlightImages: quotes.connectionFlightImages,
        connectionCabinBaggage: quotes.connectionCabinBaggage,
        connectionHoldBaggage: quotes.connectionHoldBaggage,
        connectionFlightSegments: quotes.connectionFlightSegments,
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
        selectedUpgrades: quotes.selectedUpgrades,
        trm: quotes.trm,
        customFilename: quotes.customFilename,
        minPayment: quotes.minPayment,
        minPaymentCOP: quotes.minPaymentCOP,
        finalPrice: quotes.finalPrice,
        finalPriceCOP: quotes.finalPriceCOP,
        finalPriceCurrency: quotes.finalPriceCurrency,
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        client: clients,
        user: users,
      })
      .from(quotes)
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .innerJoin(users, eq(quotes.userId, users.id))
      .orderBy(desc(quotes.createdAt));

    return result.map(r => ({
      id: r.id,
      clientId: r.clientId,
      userId: r.userId,
      totalPrice: r.totalPrice,
      originCity: r.originCity,
      flightsAndExtras: r.flightsAndExtras,
      outboundFlightImages: r.outboundFlightImages,
      returnFlightImages: r.returnFlightImages,
      includeFlights: r.includeFlights,
      outboundCabinBaggage: r.outboundCabinBaggage,
      outboundHoldBaggage: r.outboundHoldBaggage,
      returnCabinBaggage: r.returnCabinBaggage,
      returnHoldBaggage: r.returnHoldBaggage,
      domesticFlightImages: r.domesticFlightImages,
      domesticCabinBaggage: r.domesticCabinBaggage,
      domesticHoldBaggage: r.domesticHoldBaggage,
      connectionFlightImages: r.connectionFlightImages,
      connectionCabinBaggage: r.connectionCabinBaggage,
      connectionHoldBaggage: r.connectionHoldBaggage,
      connectionFlightSegments: r.connectionFlightSegments,
      turkeyUpgrade: r.turkeyUpgrade,
      italiaUpgrade: r.italiaUpgrade,
      granTourUpgrade: r.granTourUpgrade,
      selectedUpgrades: r.selectedUpgrades,
      trm: r.trm,
      customFilename: r.customFilename,
      minPayment: r.minPayment,
      minPaymentCOP: r.minPaymentCOP,
      finalPrice: r.finalPrice,
      finalPriceCOP: r.finalPriceCOP,
      finalPriceCurrency: r.finalPriceCurrency,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      client: r.client,
      user: r.user,
    }));
  }

  async getQuote(id: string, userId?: string): Promise<(Quote & { client: Client, destinations: (QuoteDestination & { destination: Destination })[] }) | undefined> {
    const quoteResult = await db
      .select({
        id: quotes.id,
        clientId: quotes.clientId,
        userId: quotes.userId,
        totalPrice: quotes.totalPrice,
        originCity: quotes.originCity,
        flightsAndExtras: quotes.flightsAndExtras,
        outboundFlightImages: quotes.outboundFlightImages,
        returnFlightImages: quotes.returnFlightImages,
        includeFlights: quotes.includeFlights,
        outboundCabinBaggage: quotes.outboundCabinBaggage,
        outboundHoldBaggage: quotes.outboundHoldBaggage,
        returnCabinBaggage: quotes.returnCabinBaggage,
        returnHoldBaggage: quotes.returnHoldBaggage,
        domesticCabinBaggage: quotes.domesticCabinBaggage,
        domesticHoldBaggage: quotes.domesticHoldBaggage,
        connectionFlightImages: quotes.connectionFlightImages,
        connectionCabinBaggage: quotes.connectionCabinBaggage,
        connectionHoldBaggage: quotes.connectionHoldBaggage,
        connectionFlightSegments: quotes.connectionFlightSegments,
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
        selectedUpgrades: quotes.selectedUpgrades,
        trm: quotes.trm,
        customFilename: quotes.customFilename,
        minPayment: quotes.minPayment,
        minPaymentCOP: quotes.minPaymentCOP,
        finalPrice: quotes.finalPrice,
        finalPriceCOP: quotes.finalPriceCOP,
        finalPriceCurrency: quotes.finalPriceCurrency,
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
        domesticFlightImages: quotes.domesticFlightImages,
        client: clients,
      })
      .from(quotes)
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.id, id))
      .limit(1);

    if (!quoteResult[0]) return undefined;

    if (userId && quoteResult[0].userId !== userId) {
      return undefined;
    }

    const destinationsResult = await db
      .select({
        id: quoteDestinations.id,
        quoteId: quoteDestinations.quoteId,
        destinationId: quoteDestinations.destinationId,
        startDate: quoteDestinations.startDate,
        passengers: quoteDestinations.passengers,
        price: quoteDestinations.price,
        destination: destinations,
      })
      .from(quoteDestinations)
      .innerJoin(destinations, eq(quoteDestinations.destinationId, destinations.id))
      .where(eq(quoteDestinations.quoteId, id));

    return {
      id: quoteResult[0].id,
      clientId: quoteResult[0].clientId,
      userId: quoteResult[0].userId,
      totalPrice: quoteResult[0].totalPrice,
      originCity: quoteResult[0].originCity,
      flightsAndExtras: quoteResult[0].flightsAndExtras,
      outboundFlightImages: quoteResult[0].outboundFlightImages,
      returnFlightImages: quoteResult[0].returnFlightImages,
      includeFlights: quoteResult[0].includeFlights,
      outboundCabinBaggage: quoteResult[0].outboundCabinBaggage,
      outboundHoldBaggage: quoteResult[0].outboundHoldBaggage,
      returnCabinBaggage: quoteResult[0].returnCabinBaggage,
      returnHoldBaggage: quoteResult[0].returnHoldBaggage,
      domesticFlightImages: quoteResult[0].domesticFlightImages,
      domesticCabinBaggage: quoteResult[0].domesticCabinBaggage,
      domesticHoldBaggage: quoteResult[0].domesticHoldBaggage,
      connectionFlightImages: quoteResult[0].connectionFlightImages,
      connectionCabinBaggage: quoteResult[0].connectionCabinBaggage,
      connectionHoldBaggage: quoteResult[0].connectionHoldBaggage,
      connectionFlightSegments: quoteResult[0].connectionFlightSegments,
      turkeyUpgrade: quoteResult[0].turkeyUpgrade,
      italiaUpgrade: quoteResult[0].italiaUpgrade,
      granTourUpgrade: quoteResult[0].granTourUpgrade,
      selectedUpgrades: quoteResult[0].selectedUpgrades as Record<string, string> | null,
      trm: quoteResult[0].trm,
      customFilename: quoteResult[0].customFilename,
      minPayment: quoteResult[0].minPayment,
      minPaymentCOP: quoteResult[0].minPaymentCOP,
      finalPrice: quoteResult[0].finalPrice,
      finalPriceCOP: quoteResult[0].finalPriceCOP,
      finalPriceCurrency: quoteResult[0].finalPriceCurrency,
      status: quoteResult[0].status,
      createdAt: quoteResult[0].createdAt,
      updatedAt: quoteResult[0].updatedAt,
      client: quoteResult[0].client,
      destinations: destinationsResult.map(d => ({
        id: d.id,
        quoteId: d.quoteId,
        destinationId: d.destinationId,
        startDate: d.startDate,
        passengers: d.passengers,
        price: d.price,
        destination: d.destination,
      })),
    };
  }

  async getQuoteStats(): Promise<{ userId: string, username: string, count: number, amount: number }[]> {
    const result = await db
      .select({
        userId: users.id,
        username: users.username,
        count: sql<number>`cast(count(${quotes.id}) as int)`,
        amount: sql<number>`cast(COALESCE(sum(cast(${quotes.totalPrice} as numeric)), 0) as int)`,
      })
      .from(users)
      .leftJoin(quotes, eq(users.id, quotes.userId))
      .where(eq(users.role, 'advisor'))
      .groupBy(users.id, users.username)
      .orderBy(desc(sql`count(${quotes.id})`));

    return result;
  }

  async deleteQuote(id: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const quoteResult = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, id))
        .limit(1);

      if (!quoteResult[0] || quoteResult[0].userId !== userId) {
        throw new Error("Quote not found or unauthorized");
      }

      const previousDestRows = await tx
        .select({
          destinationId: quoteDestinations.destinationId,
          passengers: quoteDestinations.passengers,
        })
        .from(quoteDestinations)
        .where(eq(quoteDestinations.quoteId, id));

      await applyBloqueoCuposForQuoteChange(tx, previousDestRows, []);

      await tx.delete(quoteDestinations).where(eq(quoteDestinations.quoteId, id));
      await tx.delete(quotes).where(eq(quotes.id, id));
    });
  }

  async createQuoteLog(data: InsertQuoteLog): Promise<QuoteLog> {
    const [log] = await db.insert(quoteLogs).values(data).returning();
    return log;
  }

  async getDashboardMetrics(): Promise<{
    totalQuotes: number;
    totalAmountUSD: number;
    totalClients: number;
    totalUsers: number;
    quotesThisMonth: number;
    quotesThisWeek: number;
    totalActivePlans: number;
    savedQuotesCount: number;
    savedQuotesAmount: number;
    ticketPromedio: number;
    newClientsThisMonth: number;
    quotesLastMonth: number;
    quotesLastWeek: number;
    amountThisMonth: number;
    amountThisWeek: number;
    amountLastMonth: number;
    amountLastWeek: number;
  }> {
    const [totalQuotesResult] = await db.select({ count: sql<number>`count(*)` }).from(quoteLogs);
    const [totalAmountResult] = await db.select({ sum: sql<string>`sum(COALESCE(total_price, 0))` }).from(quoteLogs);
    const [totalClientsResult] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [totalActivePlansResult] = await db.select({ count: sql<number>`count(*)` }).from(destinations).where(eq(destinations.isActive, true));

    const [savedQuotesCountResult] = await db.select({ count: sql<number>`count(*)` }).from(quotes);
    const [savedQuotesAmountResult] = await db.select({ sum: sql<string>`sum(CAST(${quotes.totalPrice} AS numeric))` }).from(quotes);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setMilliseconds(-1);

    const startOfWeek = new Date();
    const dayOfWeek = startOfWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    endOfLastWeek.setMilliseconds(-1);

    const [quotesThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfMonth}`);

    const [amountThisMonthResult] = await db
      .select({ sum: sql<string>`sum(COALESCE(total_price, 0))` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfMonth}`);

    const [quotesThisWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfWeek}`);

    const [amountThisWeekResult] = await db
      .select({ sum: sql<string>`sum(COALESCE(total_price, 0))` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfWeek}`);

    const [quotesLastMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfLastMonth} AND created_at < ${startOfMonth}`);

    const [amountLastMonthResult] = await db
      .select({ sum: sql<string>`sum(COALESCE(total_price, 0))` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfLastMonth} AND created_at < ${startOfMonth}`);

    const [quotesLastWeekResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfLastWeek} AND created_at < ${startOfWeek}`);

    const [amountLastWeekResult] = await db
      .select({ sum: sql<string>`sum(COALESCE(total_price, 0))` })
      .from(quoteLogs)
      .where(sql`created_at >= ${startOfLastWeek} AND created_at < ${startOfWeek}`);

    const [newClientsThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(sql`created_at >= ${startOfMonth}`);

    const totalQuotes = Number(totalQuotesResult?.count) || 0;
    const totalAmountUSD = Number(totalAmountResult?.sum) || 0;
    const savedQuotesCount = Number(savedQuotesCountResult?.count) || 0;
    const savedQuotesAmount = Number(savedQuotesAmountResult?.sum) || 0;

    return {
      totalQuotes,
      totalAmountUSD,
      totalClients: Number(totalClientsResult?.count) || 0,
      totalUsers: Number(totalUsersResult?.count) || 0,
      quotesThisMonth: Number(quotesThisMonthResult?.count) || 0,
      quotesThisWeek: Number(quotesThisWeekResult?.count) || 0,
      totalActivePlans: Number(totalActivePlansResult?.count) || 0,
      savedQuotesCount,
      savedQuotesAmount,
      ticketPromedio: totalQuotes > 0 ? Math.round(totalAmountUSD / totalQuotes) : 0,
      newClientsThisMonth: Number(newClientsThisMonthResult?.count) || 0,
      quotesLastMonth: Number(quotesLastMonthResult?.count) || 0,
      quotesLastWeek: Number(quotesLastWeekResult?.count) || 0,
      amountThisMonth: Number(amountThisMonthResult?.sum) || 0,
      amountThisWeek: Number(amountThisWeekResult?.sum) || 0,
      amountLastMonth: Number(amountLastMonthResult?.sum) || 0,
      amountLastWeek: Number(amountLastWeekResult?.sum) || 0,
    };
  }

  async getRecentQuotes(limit = 10): Promise<(Quote & { client: Client, user: User, destinations: { destination: { name: string } }[] })[]> {
    const quoteList = await db
      .select({
        id: quotes.id,
        clientId: quotes.clientId,
        userId: quotes.userId,
        totalPrice: quotes.totalPrice,
        status: quotes.status,
        createdAt: quotes.createdAt,
        client: clients,
        user: users,
      })
      .from(quotes)
      .innerJoin(clients, eq(quotes.clientId, clients.id))
      .innerJoin(users, eq(quotes.userId, users.id))
      .orderBy(desc(quotes.createdAt))
      .limit(limit);

    const result = await Promise.all(
      quoteList.map(async (r) => {
        const dests = await db
          .select({ destination: destinations })
          .from(quoteDestinations)
          .innerJoin(destinations, eq(quoteDestinations.destinationId, destinations.id))
          .where(eq(quoteDestinations.quoteId, r.id));
        return {
          ...r,
          destinations: dests.map(d => ({ destination: { name: d.destination.name } })),
        };
      })
    );
    return result;
  }

  async getTopDestinations(limit = 8): Promise<{ destinationId: string; destinationName: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        qd.destination_id as "destinationId",
        d.name as "destinationName",
        COUNT(*)::int as count
      FROM quote_destinations qd
      INNER JOIN destinations d ON d.id = qd.destination_id
      INNER JOIN quotes q ON q.id = qd.quote_id
      GROUP BY qd.destination_id, d.name
      ORDER BY count DESC
      LIMIT ${limit}
    `);
    return result.rows as any;
  }

  async getTopDestinationsByAmount(limit = 8): Promise<{ destinationId: string; destinationName: string; amount: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        qd.destination_id as "destinationId",
        d.name as "destinationName",
        ROUND(COALESCE(SUM(CAST(COALESCE(qd.price, 0) AS numeric)), 0))::int as amount
      FROM quote_destinations qd
      INNER JOIN destinations d ON d.id = qd.destination_id
      INNER JOIN quotes q ON q.id = qd.quote_id
      GROUP BY qd.destination_id, d.name
      ORDER BY amount DESC
      LIMIT ${limit}
    `);
    return result.rows as any;
  }

  async getQuotesByDateRange(days: number): Promise<{ date: string, count: number, amount: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count,
        SUM(COALESCE(total_price, 0)) as amount
      FROM quote_logs
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);

    return result.rows as any;
  }

  async getQuotesByClient(clientId: string): Promise<any[]> {
    const quoteList = await db
      .select()
      .from(quotes)
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quotes.createdAt));

    const quotesWithDestinations = await Promise.all(
      quoteList.map(async (quote) => {
        const dests = await db
          .select({
            id: quoteDestinations.id,
            destination: destinations,
            startDate: quoteDestinations.startDate,
            passengers: quoteDestinations.passengers,
            price: quoteDestinations.price,
          })
          .from(quoteDestinations)
          .innerJoin(destinations, eq(quoteDestinations.destinationId, destinations.id))
          .where(eq(quoteDestinations.quoteId, quote.id));

        return {
          ...quote,
          destinations: dests,
        };
      })
    );

    return quotesWithDestinations;
  }

  async getAppSetting(key: string): Promise<string | null> {
    const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return rows[0]?.value ?? null;
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async getGlobalTrmBase(): Promise<number | null> {
    const raw = await this.getAppSetting(GLOBAL_TRM_BASE_SETTING_KEY);
    return parseGlobalTrmBase(raw);
  }

  async setGlobalTrmBase(baseTrm: number | null): Promise<void> {
    if (baseTrm == null || !Number.isFinite(baseTrm) || baseTrm <= 0) {
      await db.delete(appSettings).where(eq(appSettings.key, GLOBAL_TRM_BASE_SETTING_KEY));
      return;
    }
    await this.setAppSetting(GLOBAL_TRM_BASE_SETTING_KEY, String(baseTrm));
  }

  async getTutorialCourse(id: string): Promise<TutorialCourse | undefined> {
    const [row] = await db.select().from(tutorialCourses).where(eq(tutorialCourses.id, id)).limit(1);
    return row;
  }

  async listTutorialCoursesAdmin(): Promise<TutorialCourse[]> {
    return db.select().from(tutorialCourses).orderBy(asc(tutorialCourses.displayOrder), asc(tutorialCourses.title));
  }

  async createTutorialCourse(data: InsertTutorialCourse): Promise<TutorialCourse> {
    const [row] = await db.insert(tutorialCourses).values(data).returning();
    return row;
  }

  async updateTutorialCourse(id: string, data: Partial<InsertTutorialCourse>): Promise<TutorialCourse> {
    const [row] = await db.update(tutorialCourses).set(data).where(eq(tutorialCourses.id, id)).returning();
    if (!row) throw new ValidationError("Curso no encontrado");
    return row;
  }

  async deleteTutorialCourse(id: string): Promise<void> {
    await db.delete(tutorialCourses).where(eq(tutorialCourses.id, id));
  }

  async listTutorialLessonsByCourse(courseId: string): Promise<TutorialLesson[]> {
    return db
      .select()
      .from(tutorialLessons)
      .where(eq(tutorialLessons.courseId, courseId))
      .orderBy(asc(tutorialLessons.displayOrder), asc(tutorialLessons.title));
  }

  async getTutorialLesson(id: string): Promise<TutorialLesson | undefined> {
    const [row] = await db.select().from(tutorialLessons).where(eq(tutorialLessons.id, id)).limit(1);
    return row;
  }

  async createTutorialLesson(data: InsertTutorialLesson): Promise<TutorialLesson> {
    const [row] = await db.insert(tutorialLessons).values(data).returning();
    return row;
  }

  async updateTutorialLesson(id: string, data: Partial<InsertTutorialLesson>): Promise<TutorialLesson> {
    const [row] = await db.update(tutorialLessons).set(data).where(eq(tutorialLessons.id, id)).returning();
    if (!row) throw new ValidationError("Lección no encontrada");
    return row;
  }

  async deleteTutorialLesson(id: string): Promise<void> {
    await db.delete(tutorialLessons).where(eq(tutorialLessons.id, id));
  }

  async listPublishedTutorialCoursesForUser(
    userId: string
  ): Promise<Array<TutorialCourse & { publishedLessonCount: number; completedLessonCount: number }>> {
    const publishedCourses = await db
      .select()
      .from(tutorialCourses)
      .where(eq(tutorialCourses.isPublished, true))
      .orderBy(asc(tutorialCourses.displayOrder), asc(tutorialCourses.title));
    const out: Array<TutorialCourse & { publishedLessonCount: number; completedLessonCount: number }> = [];
    for (const c of publishedCourses) {
      const lessons = await db
        .select()
        .from(tutorialLessons)
        .where(and(eq(tutorialLessons.courseId, c.id), eq(tutorialLessons.isPublished, true)));
      const publishedLessonCount = lessons.length;
      if (publishedLessonCount === 0) continue;
      const lessonIds = lessons.map((l) => l.id);
      const progressRows =
        lessonIds.length === 0
          ? []
          : await db
              .select()
              .from(tutorialLessonProgress)
              .where(
                and(
                  eq(tutorialLessonProgress.userId, userId),
                  inArray(tutorialLessonProgress.lessonId, lessonIds)
                )
              );
      const completedLessonCount = progressRows.filter((p) => p.completedAt != null).length;
      out.push({ ...c, publishedLessonCount, completedLessonCount });
    }
    return out;
  }

  async getPublishedCourseWithLessonsForUser(
    courseId: string,
    userId: string
  ): Promise<{
    course: TutorialCourse;
    lessons: Array<
      TutorialLesson & {
        progress: { viewCount: number; completedAt: Date | null; lastViewedAt: Date | null } | null;
      }
    >;
  } | null> {
    const [course] = await db
      .select()
      .from(tutorialCourses)
      .where(and(eq(tutorialCourses.id, courseId), eq(tutorialCourses.isPublished, true)))
      .limit(1);
    if (!course) return null;
    const lessons = await db
      .select()
      .from(tutorialLessons)
      .where(and(eq(tutorialLessons.courseId, courseId), eq(tutorialLessons.isPublished, true)))
      .orderBy(asc(tutorialLessons.displayOrder), asc(tutorialLessons.title));
    if (lessons.length === 0) return { course, lessons: [] };
    const lessonIds = lessons.map((l) => l.id);
    const progressRows = await db
      .select()
      .from(tutorialLessonProgress)
      .where(and(eq(tutorialLessonProgress.userId, userId), inArray(tutorialLessonProgress.lessonId, lessonIds)));
    const byLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
    return {
      course,
      lessons: lessons.map((l) => {
        const p = byLesson.get(l.id);
        return {
          ...l,
          progress: p
            ? { viewCount: p.viewCount, completedAt: p.completedAt, lastViewedAt: p.lastViewedAt }
            : null,
        };
      }),
    };
  }

  async getPublishedLessonForUser(
    lessonId: string,
    userId: string
  ): Promise<{
    lesson: TutorialLesson;
    course: TutorialCourse;
    progress: TutorialLessonProgress | null;
  } | null> {
    const [lesson] = await db
      .select()
      .from(tutorialLessons)
      .where(and(eq(tutorialLessons.id, lessonId), eq(tutorialLessons.isPublished, true)))
      .limit(1);
    if (!lesson) return null;
    const [course] = await db
      .select()
      .from(tutorialCourses)
      .where(and(eq(tutorialCourses.id, lesson.courseId), eq(tutorialCourses.isPublished, true)))
      .limit(1);
    if (!course) return null;
    const [progress] = await db
      .select()
      .from(tutorialLessonProgress)
      .where(and(eq(tutorialLessonProgress.userId, userId), eq(tutorialLessonProgress.lessonId, lessonId)))
      .limit(1);
    return { lesson, course, progress: progress ?? null };
  }

  async recordTutorialLessonView(userId: string, lessonId: string): Promise<TutorialLessonProgress> {
    const now = new Date();
    const [row] = await db
      .insert(tutorialLessonProgress)
      .values({
        userId,
        lessonId,
        viewCount: 1,
        firstViewedAt: now,
        lastViewedAt: now,
      })
      .onConflictDoUpdate({
        target: [tutorialLessonProgress.userId, tutorialLessonProgress.lessonId],
        set: {
          viewCount: sql`${tutorialLessonProgress.viewCount} + 1`,
          lastViewedAt: now,
        },
      })
      .returning();
    return row;
  }

  async completeTutorialLesson(userId: string, lessonId: string): Promise<TutorialLessonProgress> {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(tutorialLessonProgress)
      .where(and(eq(tutorialLessonProgress.userId, userId), eq(tutorialLessonProgress.lessonId, lessonId)))
      .limit(1);
    if (existing) {
      if (existing.completedAt) return existing;
      const [row] = await db
        .update(tutorialLessonProgress)
        .set({ completedAt: now, lastViewedAt: now })
        .where(
          and(eq(tutorialLessonProgress.userId, userId), eq(tutorialLessonProgress.lessonId, lessonId))
        )
        .returning();
      return row!;
    }
    const [row] = await db
      .insert(tutorialLessonProgress)
      .values({
        userId,
        lessonId,
        viewCount: 0,
        firstViewedAt: now,
        lastViewedAt: now,
        completedAt: now,
      })
      .returning();
    return row;
  }

  async uncompleteTutorialLesson(userId: string, lessonId: string): Promise<TutorialLessonProgress> {
    const [existing] = await db
      .select()
      .from(tutorialLessonProgress)
      .where(and(eq(tutorialLessonProgress.userId, userId), eq(tutorialLessonProgress.lessonId, lessonId)))
      .limit(1);
    if (!existing) {
      throw new ValidationError("No hay progreso registrado para esta lección");
    }
    if (!existing.completedAt) {
      return existing;
    }
    const now = new Date();
    const [row] = await db
      .update(tutorialLessonProgress)
      .set({ completedAt: null, lastViewedAt: now })
      .where(and(eq(tutorialLessonProgress.userId, userId), eq(tutorialLessonProgress.lessonId, lessonId)))
      .returning();
    return row!;
  }

  async getTutorialAnalytics() {
    const allCourses = await db.select().from(tutorialCourses);
    const allLessons = await db.select().from(tutorialLessons);
    const publishedCourses = allCourses.filter((c) => c.isPublished);
    const publishedLessons = allLessons.filter((l) => l.isPublished);
    const progress = await db.select().from(tutorialLessonProgress);
    const uniqueUsers = new Set(progress.map((p) => p.userId));
    const totalLessonViews = progress.reduce((s, p) => s + (p.viewCount || 0), 0);
    const totalCompletions = progress.filter((p) => p.completedAt != null).length;

    const courseTitleById = new Map(allCourses.map((c) => [c.id, c.title]));
    const byLesson: Array<{
      lessonId: string;
      lessonTitle: string;
      courseId: string;
      courseTitle: string;
      viewSum: number;
      uniqueViewers: number;
      completedCount: number;
    }> = [];
    for (const les of allLessons) {
      const rows = progress.filter((p) => p.lessonId === les.id);
      const viewSum = rows.reduce((s, p) => s + p.viewCount, 0);
      const uniqueViewers = rows.length;
      const completedCount = rows.filter((p) => p.completedAt != null).length;
      byLesson.push({
        lessonId: les.id,
        lessonTitle: les.title,
        courseId: les.courseId,
        courseTitle: courseTitleById.get(les.courseId) ?? "",
        viewSum,
        uniqueViewers,
        completedCount,
      });
    }
    byLesson.sort((a, b) => b.viewSum - a.viewSum);

    const byUserMap = new Map<
      string,
      { userId: string; lessonsWithViews: number; lessonsCompleted: number; totalViews: number }
    >();
    for (const p of progress) {
      const u = byUserMap.get(p.userId) ?? {
        userId: p.userId,
        lessonsWithViews: 0,
        lessonsCompleted: 0,
        totalViews: 0,
      };
      u.totalViews += p.viewCount;
      if (p.viewCount > 0) u.lessonsWithViews += 1;
      if (p.completedAt) u.lessonsCompleted += 1;
      byUserMap.set(p.userId, u);
    }
    const uids = Array.from(byUserMap.keys());
    const userMeta =
      uids.length === 0
        ? []
        : await db
            .select({ id: users.id, name: users.name, username: users.username })
            .from(users)
            .where(inArray(users.id, uids));
    const metaById = new Map(userMeta.map((r) => [r.id, r]));
    const byUser = uids
      .map((id) => {
        const meta = metaById.get(id);
        const agg = byUserMap.get(id)!;
        return {
          userId: id,
          name: meta?.name ?? null,
          username: meta?.username ?? id,
          ...agg,
        };
      })
      .filter((r) => r.totalViews > 0 || r.lessonsCompleted > 0);
    byUser.sort((a, b) => b.lessonsCompleted - a.lessonsCompleted || b.totalViews - a.totalViews);

    return {
      totals: {
        totalCourses: allCourses.length,
        publishedCourses: publishedCourses.length,
        totalLessons: allLessons.length,
        publishedLessons: publishedLessons.length,
        uniqueUsersWithActivity: uniqueUsers.size,
        totalLessonViews,
        totalCompletions,
      },
      byLesson,
      byUser,
    };
  }
}

export const storage = new DatabaseStorage();
