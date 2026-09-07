/**
 * Safe Browser Storage Utility
 * 
 * Provides an in-memory resilient fallback around localStorage and sessionStorage.
 * Prevents fatal crashes (DOMException, SecurityError, QuotaExceededError) in:
 * - Safari Private Browsing mode
 * - Brave Shields / strict tracking protection
 * - Firefox strict cookie/storage blocking
 * - Embedded iframes or sandboxed environments
 */

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function createSafeStorage(type: "localStorage" | "sessionStorage"): Storage {
  const memoryFallback = new MemoryStorage();

  // Pre-test if the native browser storage is accessible and writable
  let isNativeAvailable = false;
  try {
    if (typeof window !== "undefined" && window[type]) {
      const storage = window[type];
      const testKey = `__zebra_safe_test_${Math.random()}`;
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      isNativeAvailable = true;
    }
  } catch {
    isNativeAvailable = false;
  }

  return {
    get length(): number {
      try {
        if (isNativeAvailable) return window[type].length;
      } catch {
        // Fall back to memory
      }
      return memoryFallback.length;
    },

    clear(): void {
      try {
        if (isNativeAvailable) window[type].clear();
      } catch {
        // Fall back to memory
      }
      memoryFallback.clear();
    },

    getItem(key: string): string | null {
      try {
        if (isNativeAvailable) {
          const val = window[type].getItem(key);
          if (val !== null) return val;
        }
      } catch {
        // Fall back to memory
      }
      return memoryFallback.getItem(key);
    },

    key(index: number): string | null {
      try {
        if (isNativeAvailable) return window[type].key(index);
      } catch {
        // Fall back to memory
      }
      return memoryFallback.key(index);
    },

    removeItem(key: string): void {
      try {
        if (isNativeAvailable) window[type].removeItem(key);
      } catch {
        // Fall back to memory
      }
      memoryFallback.removeItem(key);
    },

    setItem(key: string, value: string): void {
      try {
        if (isNativeAvailable) {
          window[type].setItem(key, value);
        }
      } catch {
        // If native storage throws QuotaExceededError or SecurityError, save to memory
      }
      memoryFallback.setItem(key, value);
    },
  };
}

export const safeLocalStorage = createSafeStorage("localStorage");
export const safeSessionStorage = createSafeStorage("sessionStorage");

/**
 * Installs global window.localStorage and window.sessionStorage polyfills
 * if native browser storage throws SecurityError/DOMException (e.g. in Safari Private Mode).
 */
export function installSafeStoragePolyfill(): void {
  if (typeof window === "undefined") return;

  let nativeFunctional = false;
  try {
    const testKey = `__zebra_storage_test_${Math.random()}`;
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    nativeFunctional = true;
  } catch {
    nativeFunctional = false;
  }

  if (!nativeFunctional) {
    console.warn("[safeStorage] Native localStorage access restricted. Installing memory storage shim.");
    try {
      Object.defineProperty(window, "localStorage", {
        value: safeLocalStorage,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, "sessionStorage", {
        value: safeSessionStorage,
        configurable: true,
        writable: true,
      });
    } catch (e) {
      console.warn("[safeStorage] Could not override window storage property:", e);
    }
  }
}
