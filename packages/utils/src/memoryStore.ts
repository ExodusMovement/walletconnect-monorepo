const memoryStore = Object.create(null);

export abstract class MemoryStore {
  static get<T = unknown>(key: string) {
    return memoryStore[key] as T | undefined;
  }

  static set(key: string, value: unknown) {
    if (key in {}) throw new Error("security: prototype pollution");
    memoryStore[key] = value;
  }

  static delete(key: string) {
    delete memoryStore[key];
  }
}
