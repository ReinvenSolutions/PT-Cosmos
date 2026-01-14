import NodeCache from "node-cache";
import type { Destination, ItineraryDay, Hotel, Inclusion, Exclusion, DestinationImage } from "@shared/schema";

// Cache configuration
const cacheConfig = {
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance
};

export const cache = new NodeCache(cacheConfig);

// Cache keys
const CacheKeys = {
  destination: (id: string) => `destination:${id}`,
  destinations: (isActive?: boolean) => `destinations:${isActive ?? "all"}`,
  itinerary: (destinationId: string) => `itinerary:${destinationId}`,
  hotels: (destinationId: string) => `hotels:${destinationId}`,
  inclusions: (destinationId: string) => `inclusions:${destinationId}`,
  exclusions: (destinationId: string) => `exclusions:${destinationId}`,
  images: (destinationId: string) => `images:${destinationId}`,
} as const;

export { CacheKeys };

// Helper to get or set cache
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const data = await fetchFn();
  cache.set(key, data, ttl || cacheConfig.stdTTL);
  return data;
}

// Clear cache for a destination when it's updated
export function clearDestinationCache(destinationId: string) {
  cache.del(CacheKeys.destination(destinationId));
  cache.del(CacheKeys.itinerary(destinationId));
  cache.del(CacheKeys.hotels(destinationId));
  cache.del(CacheKeys.inclusions(destinationId));
  cache.del(CacheKeys.exclusions(destinationId));
  cache.del(CacheKeys.images(destinationId));
  cache.del(CacheKeys.destinations(true));
  cache.del(CacheKeys.destinations(false));
  cache.del(CacheKeys.destinations());
}
