interface CacheEntry<Value> {
  value: Value;
  expiresAt: number;
}

export class TtlCache<Key, Value> {
  private readonly entries = new Map<Key, CacheEntry<Value>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 100
  ) {}

  get(key: Key): Value | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    // Mover al final para conservar las entradas más usadas.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: Key, value: Value): void {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear(): void {
    this.entries.clear();
  }
}
