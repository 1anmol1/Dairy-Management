import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Simple session-scoped API cache.
 * - Data is cached in memory for `ttl` ms (default 5 minutes).
 * - On first load: fetches from API, caches result.
 * - On subsequent loads (sidebar navigation): returns cached data instantly — no skeleton.
 * - Call `refresh()` to force a fresh fetch and update cache.
 *
 * Usage:
 *   const { data, loading, refresh } = useApiCache('owner-customers', () => api.get('/owner/customers'));
 */

const cache = new Map(); // key → { data, ts }

const useApiCache = (key, fetcher, ttl = 5 * 60 * 1000) => {
  const getCached = () => {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < ttl) return entry.data;
    return null;
  };

  const [data, setData] = useState(() => getCached());
  const [loading, setLoading] = useState(!getCached()); // no loading if cache hit
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCached();
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        cache.set(key, { data: result, ts: Date.now() });
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [key]); // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [key]); // eslint-disable-line

  const refresh = useCallback(() => {
    cache.delete(key);
    load(true);
  }, [key, load]);

  const invalidate = useCallback((k) => {
    cache.delete(k || key);
  }, [key]);

  return { data, loading, error, refresh, invalidate };
};

export const invalidateCache = (key) => cache.delete(key);
export const clearAllCache = () => cache.clear();

export default useApiCache;
