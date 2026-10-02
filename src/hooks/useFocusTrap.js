import { useEffect } from 'react';

/** Everything that can hold focus, in the order Tab visits it. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Keeps keyboard focus inside a container while it is active.
 *
 * A drawer marked `aria-modal="true"` that still lets Tab wander into the page
 * behind it is only modal on paper: the focus ring disappears behind the
 * overlay and a screen reader can start reading hidden content. Focus moves
 * into the container on open and wraps at both ends.
 *
 * The listener sits on the document rather than the container so it still works
 * when focus has escaped to `<body>`.
 *
 * @param {boolean} active Whether the trap should be engaged.
 * @param {import('react').RefObject<HTMLElement>} containerRef The trap boundary.
 * @param {object} [options]
 * @param {import('react').RefObject<HTMLElement>} [options.initialFocusRef]
 *   Element to focus on open. Defaults to the first focusable child.
 */
export function useFocusTrap(active, containerRef, { initialFocusRef } = {}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return undefined;

    /** Visible focusable descendants, in tab order. */
    const focusable = () =>
      [...container.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetWidth > 0 || node.offsetHeight > 0 || node === document.activeElement,
      );

    (initialFocusRef?.current ?? focusable()[0])?.focus();

    function handleKeyDown(event) {
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef, initialFocusRef]);
}

export default useFocusTrap;
