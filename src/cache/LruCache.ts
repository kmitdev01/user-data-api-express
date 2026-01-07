interface CacheItem<T> {
  value: T;
  expiry: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class LruCache<T> {
  private cache: Map<string, CacheItem<T>>;
  private readonly capacity: number;
  private readonly ttlMs: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(capacity: number, ttlSeconds: number) {
    this.cache = new Map();
    this.capacity = capacity;
    this.ttlMs = ttlSeconds * 1000;

    // Background cleanup task
    setInterval(() => this.cleanup(), 5000); // Check every 5 seconds
  }

  public get(key: string): T | undefined {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh LRU position (delete and re-add)
    this.cache.delete(key);
    this.cache.set(key, item);

    this.hits++;
    return item.value;
  }

  public set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest (first key in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
