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
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";

export interface IStorage {
  getDestinations(params?: { isActive?: boolean }): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(data: InsertDestination): Promise<Destination>;
  updateDestination(id: string, data: Partial<InsertDestination>): Promise<Destination>;
  
  getItineraryDays(destinationId: string): Promise<ItineraryDay[]>;
  
  getHotels(destinationId: string): Promise<Hotel[]>;
  
  getInclusions(destinationId: string): Promise<Inclusion[]>;
  
  getExclusions(destinationId: string): Promise<Exclusion[]>;

  createUser(data: InsertUser): Promise<User>;
  findUserByUsername(username: string): Promise<User | undefined>;
  findUserById(id: string): Promise<User | undefined>;

  createClient(data: InsertClient): Promise<Client>;
  listClients(): Promise<Client[]>;
  findClientById(id: string): Promise<Client | undefined>;

  createQuote(quoteData: InsertQuote, destinationsData: InsertQuoteDestination[]): Promise<Quote>;
  updateQuote(id: string, userId: string, quoteData: Partial<InsertQuote>, destinationsData: InsertQuoteDestination[]): Promise<Quote>;
  listQuotesByUser(userId: string): Promise<(Quote & { client: Client })[]>;
  listAllQuotes(): Promise<(Quote & { client: Client, user: User })[]>;
  getQuote(id: string, userId?: string): Promise<(Quote & { client: Client, destinations: (QuoteDestination & { destination: Destination })[] }) | undefined>;
  getQuoteStats(): Promise<{ userId: string, username: string, count: number }[]>;
  deleteQuote(id: string, userId: string): Promise<void>;
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
    return db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.destinationId, destinationId))
      .orderBy(itineraryDays.dayNumber);
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

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
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
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
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
        status: quotes.status,
        createdAt: quotes.createdAt,
        updatedAt: quotes.updatedAt,
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

  async getQuoteStats(): Promise<{ userId: string, username: string, count: number }[]> {
    const result = await db
      .select({
        userId: users.id,
        username: users.username,
        count: sql<number>`cast(count(${quotes.id}) as int)`,
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
}

export const storage = new DatabaseStorage();
