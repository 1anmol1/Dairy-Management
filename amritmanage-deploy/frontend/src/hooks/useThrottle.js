/**
 * useThrottle — wraps a callback so it can only fire once per `delay` ms.
 * Use for refresh buttons and toggle actions to prevent spam clicks.
 *
 * Usage:
 *   const throttledRefresh = useThrottle(fetchData, 10000); // 10s dedup
 *   <button onClick={throttledRefresh}>Refresh</button>
 *
 * Default delay is 10 000 ms (10 seconds) — suitable for read-only
 * refresh buttons where duplicate fetches within 10s add no value.
 * Pass a shorter delay (e.g. 2000) for mutation-adjacent refreshes.
 */
import { useCallback, useRef } from 'react';

const useThrottle = (fn, delay = 10000) => {
  const lastCall = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return fn(...args);
    }
  }, [fn, delay]); // eslint-disable-line react-hooks/exhaustive-deps
};

export default useThrottle;
