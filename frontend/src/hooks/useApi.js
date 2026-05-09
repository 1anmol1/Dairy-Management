/**
 * useApi — unified data-fetching hook with:
 *  - In-memory cache (TTL-based)
 *  - Deduplication (same request in-flight → shared promise, handled in axios.js)
 *  - Instant render from cache (no blank flash)
 *  - Background refresh when cache is stale
 *  - Manual force-refresh
 *
 * Usage:
 *   const { data, loading, refresh } = useApi('/owner/staff', { ttl: 5 * 60 * 1000 });
 *
 * Options:
 *   ttl       — cache TTL in ms (default 5 min). Use 0 to disable cache.
 *   params    — query params object (included in cache key)
 *   skip      — if true, don't fetch (for conditional fetching)
 *   transform — function to transform response data before caching
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { getCache, setCache } from '../utils/cache';

const useApi = (url, options = {}) => {
  const {
    ttl = 5 * 60 * 1000,
    params,
    skip = false,
    transform = (d) => d,
  } = options;

  // Build cache key from url + params
  const cacheKey = url + (params ? JSON.stringify(params) : '');

  // Initialise from cache immediately — prevents blank flash
  const [data, setData] = useState(() => getCache(cacheKey));
  const [loading, setLoading] = useState(!getCache(cacheKey) && !skip);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async (force = false) => {
    if (skip) return;

    // Serve from cache unless forced
    if (!force && ttl > 0) {
      const cached = getCache(cacheKey);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const { data: raw } = await api.get(url, params ? { params } : undefined);
      const transformed = transform(raw);
      if (ttl > 0) setCache(cacheKey, transformed, ttl);
      if (mountedRef.current) {
        setData(transformed);
      }
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, cacheKey, skip, ttl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const refresh = useCallback(() => fetch(true), [fetch]);

  return { data, loading, error, refresh };
};

export default useApi;
