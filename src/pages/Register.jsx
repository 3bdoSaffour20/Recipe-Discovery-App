import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { OAuthButtons } from '../components/OAuthButtons';
import { NOT_CONFIGURED_MESSAGE } from '../services/supabase';
import { readReturnPath } from '../utils/navigation';

const MIN_PASSWORD_LENGTH = 8;
const CONNECTING_MIN_MS = 400;

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Registration page.
 *
 * Validates before calling Supabase so the common mistakes (a short password,
 * two passwords that do not match) never cost a network round trip, then deals
 * with both outcomes: a confirmation-required project shows a "check your
 * inbox" state, and one that signs the user in straight away sends them on to
 * the page that asked for an account.
 */
export function Register() {
  const {
    register,
    loginWithGoogle,
    loginWithFacebook,
    isAuthenticated,
    isConfigured,
    loading,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const returnPath = readReturnPath(location, searchParams);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [pendingProvider, setPendingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) navigate(returnPath, { replace: true });
  }, [isAuthenticated, loading, navigate, returnPath]);

  async function handleOAuth(provider) {
    if (pending || pendingProvider) return;

    const name = provider === 'google' ? 'Google' : 'Facebook';
    const failure = `${name} sign-up failed. Please try again.`;

    const start = Date.now();
    setError(null);
    setPendingProvider(provider);
    try {
      const signIn = provider === 'google' ? loginWithGoogle : loginWithFacebook;
      await signIn({ from: returnPath });
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await register({ fullName, email, password });

      if (result.needsConfirmation) {
        setConfirmationSent(true);
        return;
      }

      toast.success('Your account is ready. Welcome!');
      navigate(returnPath, { replace: true });
    } catch (caught) {
      setError(caught?.message || 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="auth">
        <div className="auth__card">
          <header className="auth__header">
            <span className="auth__eyebrow">One more step</span>
            <h1 className="auth__title">Confirm your email</h1>
            <p className="auth__subtitle">
              We sent a confirmation link to <strong>{email}</strong>. Open it to
              activate your account, then come back and sign in.
            </p>
          </header>

          <div className="auth__form">
            <Link className="btn btn--primary btn--lg btn--block" to="/login" state={{ from: returnPath }}>
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__header">
          <span className="auth__eyebrow">Join Recipe Discovery</span>
          <h1 className="auth__title">Create your account</h1>
          <p className="auth__subtitle">
            Rate dishes, share how they turned out and keep your favourites in sync.
          </p>
        </header>

        {!isConfigured ? (
          <p className="auth__notice">{NOT_CONFIGURED_MESSAGE}</p>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="register-name">
              Full name
            </label>
            <input
              id="register-name"
              className="input"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
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
            <label className="field__label" htmlFor="register-password">
              Password
            </label>
            <input
              id="register-password"
              className="input"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              aria-describedby="register-password-help"
            />
            <p className="field__hint" id="register-password-help">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="register-confirm">
              Confirm password
            </label>
            <input
              id="register-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Type it once more"
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block"
            disabled={pending}
          >
            {pending ? 'Creating your account...' : 'Create account'}
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

        <p className="auth__switch">
          Already have an account?{' '}
          <Link className="auth__link" to="/login" state={{ from: returnPath }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
