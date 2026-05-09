import { useState, useEffect, useRef } from 'react';

/**
 * Returns true only if loading has been true for longer than `delay` ms.
 * Default delay is 1000ms (1 second) — shows skeleton only on slow responses.
 * Fast DB responses (< 1s) show no skeleton at all.
 *
 * Usage:
 *   const showSkeleton = useDelayedLoading(loading);          // 1s default
 *   const showSkeleton = useDelayedLoading(loading, 2000);    // 2s custom
 */
const useDelayedLoading = (loading, delay = 1000) => {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      timerRef.current = setTimeout(() => {
        setShowSkeleton(true);
      }, delay);
    } else {
      clearTimeout(timerRef.current);
      setShowSkeleton(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [loading, delay]);

  return showSkeleton;
};

export default useDelayedLoading;
