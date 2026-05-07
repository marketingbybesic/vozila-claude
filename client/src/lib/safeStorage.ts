/**
 * S13: localStorage wrappers that never throw. Safari ITP, private mode,
 * disabled cookies, full quota — all silently return null/false instead of
 * crashing the page. Every read site that previously did
 *   JSON.parse(localStorage.getItem('foo') || '[]')
 * should migrate to safeRead/safeWrite for resilience.
 */

export function safeRead<T = unknown>(key: string, fallback: T | null = null): T | null {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeReadString(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeWrite(key: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
