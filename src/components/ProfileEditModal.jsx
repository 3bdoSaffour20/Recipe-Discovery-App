import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useOnEscape } from '../hooks/useOnEscape';
import { uploadAvatar, validateAvatarFile } from '../services/authService';
import { Avatar } from './Avatar';
import { CameraIcon, CloseIcon, EyeIcon, EyeOffIcon } from './Icons';

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 80;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The edit-profile dialog.
 *
 * A single form covers the three independent Supabase operations:
 *
 *   - name + avatar → `auth.updateUser({ data })` plus a matching `profiles`
 *     row update (the avatar is uploaded to Storage first);
 *   - email → `auth.updateUser({ email })`, which only *sends* a confirmation
 *     link — the address changes when the recipient opens it;
 *   - password → `auth.updateUser({ password })`, validated here first.
 *
 * Only the parts that actually changed are sent, so saving one field never
 * rewrites the others. Errors stay in the dialog next to the fields; a
 * successful save closes it and the AuthContext has already replaced the user
 * and profile state, so the card behind updates immediately.
 *
 * @param {{open: boolean, onClose: () => void, initialName?: string,
 *          initialEmail?: string, currentAvatarUrl?: string|null}} props
 */
export function ProfileEditModal({
  open,
  onClose,
  initialName = '',
  initialEmail = '',
  currentAvatarUrl = null,
}) {
  const { user, updateProfile, updateEmail, updatePassword } = useAuth();
  const toast = useToast();

  const panelRef = useRef(null);
  const nameRef = useRef(null);
  const fileInputRef = useRef(null);
  const wasOpenRef = useRef(false);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useLockBodyScroll(open);
  useFocusTrap(open, panelRef, { initialFocusRef: nameRef });

  const handleClose = useCallback(() => {
    if (!saving) onClose();
  }, [onClose, saving]);

  useOnEscape(handleClose, open);

  // Reset on each opening, not whenever the parent's copy of the name changes.
  // A successful name save updates that copy while the dialog is still open
  // (for example when a later email change fails), and resetting then would
  // wipe the fields the visitor is still working in.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setName(initialName);
      setEmail(initialEmail);
      setPassword('');
      setShowPassword(false);
      setAvatarFile(null);
      setPreviewUrl(null);
      setError(null);
      setSaving(false);
    }
    wasOpenRef.current = open;
  }, [open, initialName, initialEmail]);

  // Object URLs are revoked on replacement/unmount so a long session does not
  // accumulate image blobs.
  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!open) return null;

  const savedAvatarUrl = previewUrl || currentAvatarUrl;
  const previewName = name.trim() || initialName || 'Recipe lover';

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      setAvatarFile(null);
      return;
    }

    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      event.target.value = '';
      return;
    }

    setAvatarFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const nextName = name.trim();
    const nextEmail = email.trim();
    const previousName = String(initialName ?? '').trim();
    const previousEmail = String(initialEmail ?? '').trim();

    const nameChanged = nextName !== previousName;
    const emailChanged = nextEmail !== previousEmail;
    const passwordChanged = password.length > 0;
    const avatarChanged = Boolean(avatarFile);

    if (!nextName) {
      setError('Enter your name.');
      return;
    }
    if (nextName.length > MAX_NAME_LENGTH) {
      setError(`Your name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (emailChanged && !EMAIL_PATTERN.test(nextEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (passwordChanged && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`);
      return;
    }
    if (!nameChanged && !emailChanged && !passwordChanged && !avatarChanged) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Name and photo travel together, because both live in user metadata.
      let nextAvatarUrl;

      if (avatarChanged) {
        nextAvatarUrl = await uploadAvatar(avatarFile, user?.id);
      }

      if (nameChanged || nextAvatarUrl) {
        await updateProfile({
          fullName: nameChanged ? nextName : undefined,
          avatarUrl: nextAvatarUrl,
        });
      }

      // 2. Password next: a failure here should stop before the email link is
      //    sent, so the visitor can retry the whole save without wondering
      //    which confirmation message is still coming.
      if (passwordChanged) {
        await updatePassword(password);
      }

      // 3. Email last, because it does not take effect until it is confirmed.
      if (emailChanged) {
        await updateEmail(nextEmail);
        toast.info(
          `Confirmation link sent to ${nextEmail}. Your email changes only after you open that link.`,
        );
      }

      if (nameChanged || avatarChanged || passwordChanged) {
        toast.success('Your profile has been updated.');
      }

      onClose();
    } catch (caught) {
      const message = caught?.message || 'Your profile could not be updated. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="modal__scrim" onClick={handleClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className="modal modal--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
      >
        <button
          type="button"
          className="modal__close"
          onClick={handleClose}
          disabled={saving}
          aria-label="Close"
        >
          <CloseIcon className="modal__close-icon" />
        </button>

        <h2 className="modal__title" id="profile-edit-title">
          Edit profile
        </h2>
        <p className="modal__text">
          Update your photo, name, email address or password.
        </p>

        {error ? (
          <p className="form-error profile-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <form className="profile-form" onSubmit={handleSubmit} noValidate aria-busy={saving}>
          <div className="profile-form__avatar-row">
            <Avatar
              key={savedAvatarUrl || 'avatar-fallback'}
              src={savedAvatarUrl}
              name={previewName}
              className="profile-form__avatar"
            />

            <div className="profile-form__avatar-controls">
              <button
                type="button"
                className="btn btn--secondary profile-form__avatar-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <CameraIcon className="btn__icon" />
                {avatarFile ? 'Choose another photo' : 'Choose a photo'}
              </button>
              <input
                ref={fileInputRef}
                id="profile-avatar"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                disabled={saving}
                tabIndex={-1}
                aria-hidden="true"
              />
              <p className="field__hint">JPG, PNG, WebP or GIF, up to 2 MB.</p>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="profile-name">
              Username / full name
            </label>
            <input
              ref={nameRef}
              id="profile-name"
              className="input"
              type="text"
              autoComplete="name"
              required
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              placeholder="Your name"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="profile-email">
              Email
            </label>
            <input
              id="profile-email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={saving}
              placeholder="you@example.com"
            />
            <p className="field__hint">
              Changing your email sends a confirmation link to the new address. The
              change takes effect only after you open that link.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="profile-password">
              New password
            </label>
            <div className="password-field">
              <input
                id="profile-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saving}
                placeholder={`Leave blank to keep it · at least ${MIN_PASSWORD_LENGTH} characters`}
                aria-describedby="profile-password-hint"
              />
              <button
                type="button"
                className="password-field__toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={saving}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="profile-password"
              >
                {showPassword ? (
                  <EyeOffIcon className="password-field__icon" />
                ) : (
                  <EyeIcon className="password-field__icon" />
                )}
              </button>
            </div>
            <p className="field__hint" id="profile-password-hint">
              Leave blank to keep your current password.
            </p>
          </div>

          <div className="profile-form__actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner spinner--sm" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default ProfileEditModal;
