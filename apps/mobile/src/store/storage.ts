/**
 * Storage adapter for the auth token.
 *
 * Web uses localStorage. When this app is pointed at a real native target,
 * swap the implementation for expo-secure-store — the interface is deliberately
 * synchronous-with-a-Promise so either backend fits without touching callers.
 */
export interface TokenStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const memory = new Map<string, string>();

const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

export const webStorage: TokenStorage = {
  async get(key) {
    return hasLocalStorage() ? window.localStorage.getItem(key) : (memory.get(key) ?? null);
  },
  async set(key, value) {
    if (hasLocalStorage()) window.localStorage.setItem(key, value);
    else memory.set(key, value);
  },
  async remove(key) {
    if (hasLocalStorage()) window.localStorage.removeItem(key);
    else memory.delete(key);
  },
};
