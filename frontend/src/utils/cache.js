/**
 * Simple in-memory cache for API responses.
 * Prevents duplicate requests when navigating between pages.
 * Security: in-memory only (not localStorage), cleared on logout.
 * Never cache sensitive fields — passwords, tokens, OTPs are never
 * in API responses so this is safe by design.
 */

const _store = new Map(); // key → { data, expiresAt }

/**
 * Get cached value. Returns null if missing or expired.
 */
export const getCache = (key) => {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * Store a value with a TTL (default 5 minutes).
 */
export const setCache = (key, data, ttlMs = 5 * 60 * 1000) => {
  _store.set(key, { data, expiresAt: Date.now() + ttlMs });
};

/**
 * Remove a specific key (call after mutations so next fetch is fresh).
 */
export const invalidateCache = (key) => {
  _store.delete(key);
};

/**
 * Remove all keys matching a prefix.
 * e.g. invalidateCachePrefix('owner/logs') removes all log queries.
 */
export const invalidateCachePrefix = (prefix) => {
  for (const key of _store.keys()) {
    if (key.startsWith(prefix)) _store.delete(key);
  }
};

/**
 * Clear everything (on logout).
 */
export const clearAllCache = () => {
  _store.clear();
};
