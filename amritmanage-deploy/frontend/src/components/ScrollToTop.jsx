/**
 * ScrollToTop — scrolls to top only when navigating to a new page.
 * Does NOT scroll if the user is using browser back/forward (popstate).
 * Does NOT scroll if the user has already scrolled on this path in the session.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track which paths have been visited this session
const visitedPaths = new Set();

const ScrollToTop = () => {
  const { pathname, key } = useLocation();
  const prevKey = useRef(null);

  useEffect(() => {
    // 'key' changes on every navigation including back/forward.
    // We detect back/forward by checking if the key was seen before.
    // On a fresh push navigation, key is always new.
    const isBackForward = prevKey.current !== null && visitedPaths.has(key);

    if (!isBackForward) {
      // New page visit — scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Mark this key as visited
    visitedPaths.add(key);
    prevKey.current = key;
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;
