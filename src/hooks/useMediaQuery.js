import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query from JavaScript.
 *
 * Only needed where CSS alone cannot express the state (closing the mobile
 * drawer when the viewport grows past the desktop breakpoint, for example).
 *
 * @param {string} query e.g. '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return undefined;

    const list = window.matchMedia(query);
    setMatches(list.matches);

    function handleChange(event) {
      setMatches(event.matches);
    }

    // addEventListener is unavailable on MediaQueryList in older Safari.
    if (list.addEventListener) {
      list.addEventListener('change', handleChange);
      return () => list.removeEventListener('change', handleChange);
    }

    list.addListener(handleChange);
    return () => list.removeListener(handleChange);
  }, [query]);

  return matches;
}

export default useMediaQuery;