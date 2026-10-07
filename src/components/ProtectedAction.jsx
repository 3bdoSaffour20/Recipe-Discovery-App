import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NOT_CONFIGURED_MESSAGE } from '../services/supabase';
import { ReviewModal } from './ReviewModal';

/**
 * Wraps an action that requires an account — rating stars, a comment form —
 * so a signed-out visitor is never silently ignored.
 *
 * The click is intercepted in the capture phase: while signed out the child
 * never sees the event, and the "please log in" dialog opens instead. Signed
 * in, the wrapper is inert (`display: contents`, so it adds no layout) and the
 * child behaves exactly as it would on its own.
 *
 * Two states are deliberately *not* the login dialog:
 *
 *   - while the session is still restoring, the click is swallowed so nobody
 *     is told to sign in one frame before Supabase says they already are;
 *   - when the project has no Supabase keys at all, the dialog explains the
 *     configuration instead of offering sign-in buttons that cannot work.
 *
 * @param {object} props
 * @param {string} props.message The gate headline, e.g. "Please log in to rate
 *   this recipe."
 * @param {import('react').ReactNode} props.children The gated action.
 */
export function ProtectedAction({ message, children }) {
  const { isAuthenticated, isConfigured, loading } = useAuth();
  const [blocked, setBlocked] = useState(false);

  function handleCapture(event) {
    if (loading) {
      // Session still restoring: no verdict yet, so no dialog either.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isAuthenticated) return;

    event.preventDefault();
    event.stopPropagation();
    setBlocked(true);
  }

  return (
    <>
      {/* A div, not a span: `display: contents` keeps it out of the layout,
          while still allowing the gated child to be a form or a block. */}
      <div className="guard" onClickCapture={handleCapture}>
        {children}
      </div>

      <ReviewModal
        open={blocked}
        message={isConfigured ? message : NOT_CONFIGURED_MESSAGE}
        showAuthActions={isConfigured}
        onClose={() => setBlocked(false)}
      />
    </>
  );
}

export default ProtectedAction;
