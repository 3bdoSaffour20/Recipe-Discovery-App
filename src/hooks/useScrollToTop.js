import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the scroll position on navigation.
 *
 * Skipped on hash changes, which browsers resolve against the document
 * themselves. `instant` avoids the smooth-scroll animation fighting a route
 * change.
 */
export function useScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
}

export default useScrollToTop;