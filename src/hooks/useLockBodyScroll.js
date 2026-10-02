import { useEffect } from 'react';

/**
 * Prevents the page behind an overlay from scrolling while it is open.
 *
 * Compensates for the disappearing scrollbar by padding the body, which stops
 * the layout shifting sideways on desktop. The original inline styles are
 * restored on cleanup so the hook is safe to toggle.
 *
 * @param {boolean} locked
 */
export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    // Width of the scrollbar, so removing it does not shift the layout.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // `overflow: hidden` alone does not stop the page behind an overlay from
    // scrolling on iOS, so the class also disables touch scrolling and rubber
    // banding there.
    body.classList.add('scroll-locked');
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.classList.remove('scroll-locked');
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}

export default useLockBodyScroll;