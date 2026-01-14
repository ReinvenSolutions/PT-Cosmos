import { describe, it, expect, beforeEach } from "vitest";
import { cache, CacheKeys, getOrSetCache, clearDestinationCache } from "../cache";

describe("Cache Utils", () => {
  beforeEach(() => {
    cache.flushAll();
  });

  it("should cache and retrieve data", async () => {
    const key = "test:key";
    const data = { test: "data" };

    const result = await getOrSetCache(key, async () => data);
    expect(result).toEqual(data);

    // Second call should use cache
    const cached = await getOrSetCache(key, async () => ({ different: "data" }));
    expect(cached).toEqual(data);
  });

  it("should generate correct cache keys", () => {
    expect(CacheKeys.destination("123")).toBe("destination:123");
    expect(CacheKeys.itinerary("456")).toBe("itinerary:456");
    expect(CacheKeys.hotels("789")).toBe("hotels:789");
  });

  it("should clear destination cache", () => {
    const destinationId = "test-dest";
    cache.set(CacheKeys.destination(destinationId), { id: destinationId });
    cache.set(CacheKeys.itinerary(destinationId), []);
    
    clearDestinationCache(destinationId);
    
    expect(cache.get(CacheKeys.destination(destinationId))).toBeUndefined();
    expect(cache.get(CacheKeys.itinerary(destinationId))).toBeUndefined();
  });
});
