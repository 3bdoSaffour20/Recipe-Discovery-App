import { useEffect } from 'react';

/**
 * Runs `handler` when the Escape key is pressed anywhere on the page.
 * Used to dismiss the mobile navigation drawer.
 *
 * @param {(event: KeyboardEvent) => void} handler
 * @param {boolean} [active] Set false to detach the listener.
 */
export function useOnEscape(handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') handler(event);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handler, active]);
}

export default useOnEscape;