import { LRUCache } from 'lru-cache';

export const apiCache = new LRUCache<string, any>({
  max: 500, // Max 500 items in cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  allowStale: true,
});

export const getOrSetCache = async <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
  const cached = apiCache.get(key);
  if (cached) {
    return cached as T;
  }
  
  const data = await fetcher();
  apiCache.set(key, data);
  return data;
};

export const clearCachePrefix = (prefix: string) => {
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) {
      apiCache.delete(key);
    }
  }
};
