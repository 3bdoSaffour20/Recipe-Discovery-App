import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loading } from '../components/Loading';
import { updatePassword } from '../services/authService';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Password recovery landing page.
 *
 * Supabase's reset email points here. Following the link establishes a short
 * recovery session, so the signed-in visitor can simply choose a new password;
 * anyone arriving without that session (an expired or reused link) is told as
 * much instead of staring at a form that would fail on submit.
 */
export function ResetPassword() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  if (loading) {
    return (
      <div className="container--narrow">
        <Loading label="Checking your reset link" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth">
        <div className="auth__card">
          <header className="auth__header">
            <span className="auth__eyebrow">Password reset</span>
            <h1 className="auth__title">This link has expired</h1>
            <p className="auth__subtitle">
              Reset links are single use and short lived. Request a fresh one and
              open it straight away.
            </p>
          </header>

          <div className="auth__form">
            <Link className="btn btn--primary btn--lg btn--block" to="/login">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
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
      await updatePassword(password);
      toast.success('Your password has been updated.');
      navigate('/profile', { replace: true });
    } catch (caught) {
      setError(caught?.message || 'Your password could not be updated.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <header className="auth__header">
          <span className="auth__eyebrow">Password reset</span>
          <h1 className="auth__title">Choose a new password</h1>
          <p className="auth__subtitle">
            This replaces the password for <strong>{user.email}</strong>.
          </p>
        </header>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
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
            {pending ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
