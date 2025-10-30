import {
  users,
  clients,
  destinations,
  itineraryDays,
  hotels,
  inclusions,
  exclusions,
  quotes,
  quoteDestinations,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
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
  type Quote,
  type InsertQuote,
  type QuoteDestination,
  type InsertQuoteDestination,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getClients(params?: { status?: string; search?: string }): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  
  getDestinations(params?: { isActive?: boolean }): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  updateDestination(id: string, destination: Partial<InsertDestination>): Promise<Destination | undefined>;
  deleteDestination(id: string): Promise<void>;
  
  getItineraryDays(destinationId: string): Promise<ItineraryDay[]>;
  createItineraryDay(day: InsertItineraryDay): Promise<ItineraryDay>;
  updateItineraryDay(id: string, day: Partial<InsertItineraryDay>): Promise<ItineraryDay | undefined>;
  deleteItineraryDay(id: string): Promise<void>;
  deleteItineraryDaysByDestination(destinationId: string): Promise<void>;
  
  getHotels(destinationId: string): Promise<Hotel[]>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: string, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: string): Promise<void>;
  
  getInclusions(destinationId: string): Promise<Inclusion[]>;
  createInclusion(inclusion: InsertInclusion): Promise<Inclusion>;
  deleteInclusion(id: string): Promise<void>;
  
  getExclusions(destinationId: string): Promise<Exclusion[]>;
  createExclusion(exclusion: InsertExclusion): Promise<Exclusion>;
  deleteExclusion(id: string): Promise<void>;
  
  getQuotes(params?: { userId?: string; search?: string; status?: string }): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;
  
  getQuoteDestinations(quoteId: string): Promise<QuoteDestination[]>;
  createQuoteDestination(qd: InsertQuoteDestination): Promise<QuoteDestination>;
  deleteQuoteDestination(id: string): Promise<void>;
  deleteQuoteDestinationsByQuote(quoteId: string): Promise<void>;
  
  getQuoteWithDetails(id: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getClients(params?: { status?: string; search?: string }): Promise<Client[]> {
    const conditions = [];
    
    if (params?.status) {
      conditions.push(eq(clients.status, params.status));
    }
    
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        sql`(${clients.name} ILIKE ${searchPattern} OR ${clients.email} ILIKE ${searchPattern} OR ${clients.company} ILIKE ${searchPattern})`
      );
    }
    
    const query = db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt));
    
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db
      .insert(clients)
      .values(client)
      .returning();
    return created;
  }

  async updateClient(
    id: string,
    client: Partial<InsertClient>
  ): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getDestinations(params?: { isActive?: boolean }): Promise<Destination[]> {
    const conditions = [];
    if (params?.isActive !== undefined) {
      conditions.push(eq(destinations.isActive, params.isActive));
    }
    
    const query = db
      .select()
      .from(destinations)
      .orderBy(destinations.displayOrder, destinations.name);
    
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getDestination(id: string): Promise<Destination | undefined> {
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id));
    return destination;
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const [created] = await db
      .insert(destinations)
      .values(destination)
      .returning();
    return created;
  }

  async updateDestination(
    id: string,
    destination: Partial<InsertDestination>
  ): Promise<Destination | undefined> {
    const [updated] = await db
      .update(destinations)
      .set(destination)
      .where(eq(destinations.id, id))
      .returning();
    return updated;
  }

  async deleteDestination(id: string): Promise<void> {
    await db.delete(destinations).where(eq(destinations.id, id));
  }

  async getItineraryDays(destinationId: string): Promise<ItineraryDay[]> {
    return db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.destinationId, destinationId))
      .orderBy(itineraryDays.dayNumber);
  }

  async createItineraryDay(day: InsertItineraryDay): Promise<ItineraryDay> {
    const [created] = await db
      .insert(itineraryDays)
      .values(day)
      .returning();
    return created;
  }

  async updateItineraryDay(
    id: string,
    day: Partial<InsertItineraryDay>
  ): Promise<ItineraryDay | undefined> {
    const [updated] = await db
      .update(itineraryDays)
      .set(day)
      .where(eq(itineraryDays.id, id))
      .returning();
    return updated;
  }

  async deleteItineraryDay(id: string): Promise<void> {
    await db.delete(itineraryDays).where(eq(itineraryDays.id, id));
  }

  async deleteItineraryDaysByDestination(destinationId: string): Promise<void> {
    await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
  }

  async getHotels(destinationId: string): Promise<Hotel[]> {
    return db
      .select()
      .from(hotels)
      .where(eq(hotels.destinationId, destinationId));
  }

  async createHotel(hotel: InsertHotel): Promise<Hotel> {
    const [created] = await db
      .insert(hotels)
      .values(hotel)
      .returning();
    return created;
  }

  async updateHotel(
    id: string,
    hotel: Partial<InsertHotel>
  ): Promise<Hotel | undefined> {
    const [updated] = await db
      .update(hotels)
      .set(hotel)
      .where(eq(hotels.id, id))
      .returning();
    return updated;
  }

  async deleteHotel(id: string): Promise<void> {
    await db.delete(hotels).where(eq(hotels.id, id));
  }

  async getInclusions(destinationId: string): Promise<Inclusion[]> {
    return db
      .select()
      .from(inclusions)
      .where(eq(inclusions.destinationId, destinationId))
      .orderBy(inclusions.displayOrder);
  }

  async createInclusion(inclusion: InsertInclusion): Promise<Inclusion> {
    const [created] = await db
      .insert(inclusions)
      .values(inclusion)
      .returning();
    return created;
  }

  async deleteInclusion(id: string): Promise<void> {
    await db.delete(inclusions).where(eq(inclusions.id, id));
  }

  async getExclusions(destinationId: string): Promise<Exclusion[]> {
    return db
      .select()
      .from(exclusions)
      .where(eq(exclusions.destinationId, destinationId))
      .orderBy(exclusions.displayOrder);
  }

  async createExclusion(exclusion: InsertExclusion): Promise<Exclusion> {
    const [created] = await db
      .insert(exclusions)
      .values(exclusion)
      .returning();
    return created;
  }

  async deleteExclusion(id: string): Promise<void> {
    await db.delete(exclusions).where(eq(exclusions.id, id));
  }

  async getQuotes(params?: { userId?: string; search?: string; status?: string }): Promise<Quote[]> {
    const conditions = [];
    
    if (params?.userId) {
      conditions.push(eq(quotes.userId, params.userId));
    }
    
    if (params?.status) {
      conditions.push(eq(quotes.status, params.status));
    }
    
    if (params?.search) {
      conditions.push(
        sql`(${quotes.clientName} ILIKE ${`%${params.search}%`} OR ${quotes.clientEmail} ILIKE ${`%${params.search}%`})`
      );
    }
    
    let query = db
      .select()
      .from(quotes)
      .orderBy(desc(quotes.createdAt));
    
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db
      .insert(quotes)
      .values(quote)
      .returning();
    return created;
  }

  async updateQuote(
    id: string,
    quote: Partial<InsertQuote>
  ): Promise<Quote | undefined> {
    const [updated] = await db
      .update(quotes)
      .set({
        ...quote,
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, id))
      .returning();
    return updated;
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  async getQuoteDestinations(quoteId: string): Promise<QuoteDestination[]> {
    return db
      .select()
      .from(quoteDestinations)
      .where(eq(quoteDestinations.quoteId, quoteId))
      .orderBy(quoteDestinations.displayOrder);
  }

  async createQuoteDestination(qd: InsertQuoteDestination): Promise<QuoteDestination> {
    const [created] = await db
      .insert(quoteDestinations)
      .values(qd)
      .returning();
    return created;
  }

  async deleteQuoteDestination(id: string): Promise<void> {
    await db.delete(quoteDestinations).where(eq(quoteDestinations.id, id));
  }

  async deleteQuoteDestinationsByQuote(quoteId: string): Promise<void> {
    await db.delete(quoteDestinations).where(eq(quoteDestinations.quoteId, quoteId));
  }

  async getQuoteWithDetails(id: string): Promise<any> {
    const quote = await this.getQuote(id);
    if (!quote) return undefined;

    const qds = await this.getQuoteDestinations(id);
    const destinationIds = qds.map(qd => qd.destinationId);
    
    const destinationDetails = await Promise.all(
      destinationIds.map(async (destId) => {
        const destination = await this.getDestination(destId);
        const itinerary = await this.getItineraryDays(destId);
        const hotels = await this.getHotels(destId);
        const inclusionsList = await this.getInclusions(destId);
        const exclusionsList = await this.getExclusions(destId);
        
        return {
          destination,
          itinerary,
          hotels,
          inclusions: inclusionsList,
          exclusions: exclusionsList,
        };
      })
    );

    return {
      ...quote,
      quoteDestinations: qds,
      destinations: destinationDetails,
    };
  }
}

export const storage = new DatabaseStorage();
