import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../components/Loading';
import {
  describeAuthError,
  ensureProfile,
  readOAuthErrorFromUrl,
  waitForAuthSession,
} from '../services/authService';
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from '../services/supabase';
import { safeReturnPath } from '../utils/navigation';

/**
 * OAuth return page — `/auth/callback`.
 *
 * Google and Facebook land here with either tokens in the URL hash or a
 * `?code=` to exchange. The page does one thing carefully: it **waits** for
 * the Supabase session to exist before sending anyone anywhere, because a
 * redirect issued a millisecond too early is what produces "please log in"
 * screens for people who have just signed in.
 *
 * Only once the session is real does it make sure the `profiles` row exists
 * and hand the visitor back — client-side, no page reload — to where they
 * started: the recipe they were trying to rate, not the home page.
 */
export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [failure, setFailure] = useState(() => readOAuthErrorFromUrl());

  const returnPath = safeReturnPath(
    searchParams.get('from') ?? searchParams.get('redirect') ?? '/',
  );

  useEffect(() => {
    if (failure) return undefined;
    if (!isSupabaseConfigured) {
      setFailure(NOT_CONFIGURED_MESSAGE);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const session = await waitForAuthSession();
        if (cancelled) return;

        if (!session) {
          setFailure('We could not complete the sign-in. Please try again.');
          return;
        }

        // The profile row must exist before the recipe page asks for it.
        // AuthContext does the same on its own listener; this call is the
        // guarantee for the very first OAuth sign-in.
        await ensureProfile(session.user);
        if (cancelled) return;

        navigate(returnPath, { replace: true });
      } catch (error) {
        if (!cancelled) setFailure(describeAuthError(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [failure, navigate, returnPath]);

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__header">
          <span className="auth__eyebrow">{failure ? 'Sign-in' : 'Almost there'}</span>
          <h1 className="auth__title">{failure ? 'Sign-in failed' : 'Signing you in'}</h1>
          <p className="auth__subtitle">
            {failure ?? 'Finishing your sign-in with Supabase…'}
          </p>
        </header>

        {failure ? (
          <div className="auth__form">
            <Link
              className="btn btn--primary btn--lg btn--block"
              to={`/login?from=${encodeURIComponent(returnPath)}`}
            >
              Back to sign in
            </Link>
            <Link className="btn btn--ghost btn--block" to="/">
              Go to home
            </Link>
          </div>
        ) : (
          <Loading label="Signing you in" small />
        )}
      </div>
    </div>
  );
}

export default AuthCallback;
