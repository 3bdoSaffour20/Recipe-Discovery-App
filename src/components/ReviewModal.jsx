import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useOnEscape } from '../hooks/useOnEscape';
import { AlertIcon, CloseIcon } from './Icons';

/**
 * The "log in first" dialog.
 *
 * Shown when a visitor tries to rate or comment without an account. It states
 * what is needed and offers both ways in, and it carries the page they were on
 * — as `?redirect=` on the link and as router state — so signing in returns
 * them to the exact recipe they came from, never the home page.
 *
 * When Supabase is not configured the same dialog explains that instead of
 * offering sign-in buttons that could not work (`showAuthActions={false}`).
 *
 * @param {{open: boolean, message: string, onClose: () => void,
 *          showAuthActions?: boolean}} props
 */
export function ReviewModal({ open, message, onClose, showAuthActions = true }) {
  useLockBodyScroll(open);
  useOnEscape(onClose, open);

  const location = useLocation();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useFocusTrap(open, panelRef, { initialFocusRef: closeRef });

  // Remounting a closed dialog would replay its entry animation on the next
  // open; returning null keeps it out of the DOM entirely.
  if (!open) return null;

  const from = `${location.pathname}${location.search}`;

  return (
    <>
      <div className="modal__scrim" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-gate-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon className="modal__close-icon" />
        </button>

        <span className="modal__icon" aria-hidden="true">
          <AlertIcon width="26" height="26" />
        </span>

        <h2 className="modal__title" id="auth-gate-title">
          {message}
        </h2>

        <p className="modal__text">
          {showAuthActions
            ? 'Signing in takes a moment and keeps your ratings and comments attached to you.'
            : 'Accounts and reviews switch on as soon as the Supabase project is connected.'}
        </p>

        <div className="modal__actions">
          {showAuthActions ? (
            <>
              <Link
                className="btn btn--primary btn--lg"
                to={`/login?redirect=${encodeURIComponent(from)}`}
                state={{ from }}
                onClick={onClose}
              >
                Login
              </Link>
              <Link
                className="btn btn--secondary btn--lg"
                to={`/register?redirect=${encodeURIComponent(from)}`}
                state={{ from }}
                onClick={onClose}
              >
                Register
              </Link>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default ReviewModal;
