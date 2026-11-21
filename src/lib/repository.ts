// Persistence boundary. Everything that stores user data goes through a
// repository so a remote backend can replace localStorage later without
// touching UI code: implement `KeyValueRepository` with fetch() calls and
// swap `repository` below.

export interface KeyValueRepository {
  load<T>(key: string): T | null;
  save<T>(key: string, value: T): void;
  remove(key: string): void;
}

class LocalStorageRepository implements KeyValueRepository {
  private prefix = "keyflow:";
  load<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  save<T>(key: string, value: T) {
    try {
      window.localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.warn("KeyFlow: could not save", key, e);
    }
  }
  remove(key: string) {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      /* ignore */
    }
  }
}

class MemoryRepository implements KeyValueRepository {
  private data = new Map<string, string>();
  load<T>(key: string) {
    const raw = this.data.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  save<T>(key: string, value: T) {
    this.data.set(key, JSON.stringify(value));
  }
  remove(key: string) {
    this.data.delete(key);
  }
}

export const repository: KeyValueRepository =
  typeof window !== "undefined" ? new LocalStorageRepository() : new MemoryRepository();
