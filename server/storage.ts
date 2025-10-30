import {
  destinations,
  itineraryDays,
  hotels,
  inclusions,
  exclusions,
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
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getDestinations(params?: { isActive?: boolean }): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | undefined>;
  
  getItineraryDays(destinationId: string): Promise<ItineraryDay[]>;
  
  getHotels(destinationId: string): Promise<Hotel[]>;
  
  getInclusions(destinationId: string): Promise<Inclusion[]>;
  
  getExclusions(destinationId: string): Promise<Exclusion[]>;
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
}

export const storage = new DatabaseStorage();
