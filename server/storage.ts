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
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, count } from "drizzle-orm";
import { logger } from "./logger";

export interface IStorage {
  getDestinations(params?: { isActive?: boolean }): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
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
  updateUserByAdmin(id: string, data: Partial<{ name: string; username: string; email: string | null; role: string; isActive: boolean; passwordHash: string; twoFactorEnabled: boolean }>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  countQuotesByUser(userId: string): Promise<number>;
  findUserByUsername(username: string): Promise<User | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  async getDestinations(params?: { isActive?: boolean }): Promise<Destination[]> {
    if (params?.isActive !== undefined) {
      return db
        .select()
        .from(destinations)
        .where(eq(destinations.isActive, params.isActive))
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
      twoFactorEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
    return result;
  }

  async updateUserByAdmin(id: string, data: Partial<{ name: string; username: string; email: string | null; role: string; isActive: boolean; passwordHash: string; twoFactorEnabled: boolean }>): Promise<User> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.username !== undefined) updates.username = data.username;
    if (data.email !== undefined) updates.email = data.email;
    if (data.role !== undefined) updates.role = data.role;
    if (data.isActive !== undefined) updates.isActive = data.isActive;
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
    const quoteCount = await this.countQuotesByUser(id);
    if (quoteCount > 0) {
      throw new Error(`No se puede eliminar: el usuario tiene ${quoteCount} cotización(es) asociada(s). Desactívalo en su lugar.`);
    }
    await db.delete(users).where(eq(users.id, id));
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
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
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
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
      turkeyUpgrade: r.turkeyUpgrade,
      italiaUpgrade: r.italiaUpgrade,
      granTourUpgrade: r.granTourUpgrade,
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
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
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
      turkeyUpgrade: r.turkeyUpgrade,
      italiaUpgrade: r.italiaUpgrade,
      granTourUpgrade: r.granTourUpgrade,
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
        turkeyUpgrade: quotes.turkeyUpgrade,
        italiaUpgrade: quotes.italiaUpgrade,
        granTourUpgrade: quotes.granTourUpgrade,
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
      turkeyUpgrade: quoteResult[0].turkeyUpgrade,
      italiaUpgrade: quoteResult[0].italiaUpgrade,
      granTourUpgrade: quoteResult[0].granTourUpgrade,
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
}

export const storage = new DatabaseStorage();
