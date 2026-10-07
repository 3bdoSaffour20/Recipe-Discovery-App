import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OAuthButtons } from '../components/OAuthButtons';
import { readOAuthErrorFromUrl, sendPasswordReset } from '../services/authService';
import { NOT_CONFIGURED_MESSAGE } from '../services/supabase';
import { readReturnPath } from '../utils/navigation';

/**
 * Sign-in page.
 *
 * Carries the visitor back to wherever the login gate interrupted them — the
 * recipe they were trying to rate, or the page they arrived on through the
 * OAuth redirect — and offers email/password, Google, Facebook and an inline
 * password-reset request so nobody has to hunt for a second route.
 */

/** Keeps "Connecting to …" readable even when the request fails instantly. */
const CONNECTING_MIN_MS = 400;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
export function Login() {
  const { login, loginWithGoogle, loginWithFacebook, isAuthenticated, isConfigured, loading } =
    useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const returnPath = readReturnPath(location, searchParams);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPending, setResetPending] = useState(false);
  const [oauthError, setOauthError] = useState(null);

  // A provider that denies access lands back here with the failure on the
  // URL; read it once, then clean the failure off the URL so a refresh does
  // not replay it. The cleanup waits and re-checks so it can never race the
  // client that parses `#access_token=…` on its own.
  useEffect(() => {
    const message = readOAuthErrorFromUrl();
    if (message) setOauthError(message);

    const hasError = () => /error/i.test(window.location.hash ?? '');
    if (!hasError()) return undefined;

    const timer = window.setTimeout(() => {
      if (hasError()) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        );
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  // Already signed in (including the moment after an OAuth return) → continue
  // to the page that asked for an account.
  useEffect(() => {
    if (isAuthenticated && !loading) navigate(returnPath, { replace: true });
  }, [isAuthenticated, loading, navigate, returnPath]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      await login({ email, password });
      toast.success('Welcome back!');
      navigate(returnPath, { replace: true });
    } catch (caught) {
      setError(caught?.message || 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function handleOAuth(provider) {
    // One redirect at a time: the buttons disable themselves, and this guard
    // catches the click that slipped in before the re-render.
    if (pending || pendingProvider) return;

    const name = provider === 'google' ? 'Google' : 'Facebook';
    const failure = `${name} login failed. Please try again.`;

    const start = Date.now();
    setError(null);
    setPendingProvider(provider);
    try {
      const signIn = provider === 'google' ? loginWithGoogle : loginWithFacebook;
      await signIn({ from: returnPath });
      // The browser leaves for the provider here; the session comes back on
      // the redirect to `/auth/callback`, which waits for it before returning
      // to `returnPath`.
    } catch (caught) {
      const elapsed = Date.now() - start;
      if (elapsed < CONNECTING_MIN_MS) await wait(CONNECTING_MIN_MS - elapsed);
      const message = caught?.message;
      setError(
        message && message !== 'Something went wrong. Please try again.' ? message : failure,
      );
      setPendingProvider(null);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    if (resetPending) return;

    setResetPending(true);
    setError(null);
    try {
      await sendPasswordReset(resetEmail);
      toast.success('Check your inbox for a password reset link.');
      setResetMode(false);
      setResetEmail('');
    } catch (caught) {
      setError(caught?.message || 'The reset link could not be sent.');
    } finally {
      setResetPending(false);
    }
  }

  const shownError = oauthError ?? error;

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__header">
          <span className="auth__eyebrow">Welcome back</span>
          <h1 className="auth__title">Sign in</h1>
          <p className="auth__subtitle">
            Sign in to rate recipes, leave comments and pick up where you left off.
          </p>
        </header>

        {!isConfigured ? (
          <p className="auth__notice">{NOT_CONFIGURED_MESSAGE}</p>
        ) : null}

        {shownError ? (
          <p className="form-error" role="alert">
            {shownError}
          </p>
        ) : null}

        {resetMode ? (
          <form className="auth__form" onSubmit={handleReset} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={resetPending}>
              {resetPending ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => setResetMode(false)}
              disabled={resetPending}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <form className="auth__form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg btn--block"
                disabled={pending}
              >
                {pending ? 'Signing in...' : 'Sign in'}
              </button>

              <button
                type="button"
                className="link-button auth__link-button"
                onClick={() => setResetMode(true)}
                disabled={pending}
              >
                Forgot your password?
              </button>
            </form>

            <div className="auth__divider" role="separator">
              <span>or</span>
            </div>

            <OAuthButtons
              onSelect={handleOAuth}
              pendingProvider={pendingProvider}
              disabled={pending}
            />
          </>
        )}

        <p className="auth__switch">
          New to Recipe Discovery?{' '}
          <Link className="auth__link" to="/register" state={{ from: returnPath }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
