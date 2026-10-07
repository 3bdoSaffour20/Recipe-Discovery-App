import {
  appUrl,
  describeServiceError,
  isSupabaseConfigured,
  requireSupabase,
  supabase,
} from './supabase';

/**
 * Authentication service.
 *
 * Every sign-in, sign-up, OAuth and sign-out call the app makes goes through
 * this module, which also owns:
 *
 *   - turning Supabase's technical error codes into sentences a person can act
 *     on (the raw messages stay out of the UI);
 *   - profile creation, so the `profiles` row exists for email *and* OAuth
 *     users with the name, avatar and provider that came from the provider;
 *   - the OAuth return URL (`/auth/callback`), which has to be an absolute
 *     URL inside the app;
 *   - waiting for the session to actually exist after a provider redirect, so
 *     no screen races the return and concludes "signed out" too early.
 *
 * All of it runs on the one shared client from `./supabase` — the same object
 * `reviewService.js` uses — so signing in and saving a review can never
 * disagree about who is signed in.
 *
 * Passwords only ever travel to Supabase Auth. They are never stored, logged
 * or written to any local storage by this file.
 */

/** Friendly messages keyed by Supabase error code. */
const ERROR_MESSAGES = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Please confirm your email address before signing in.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  email_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Password is too weak. Use at least 8 characters.',
  validation_failed: 'Please check the highlighted fields and try again.',
  invalid_email: 'Please enter a valid email address.',
  over_email_send_rate_limit: 'Too many attempts. Wait a minute and try again.',
  too_many_requests: 'Too many attempts. Wait a minute and try again.',
  signup_disabled: 'Registration is currently disabled.',
  user_not_found: 'No account matches those details.',
  provider_email_needs_verification: 'That provider did not share a verified email address.',
  session_not_found: 'Your session has expired. Please sign in again.',
  refresh_token_not_found: 'Your session has expired. Please sign in again.',
};

/** Maps a raw error to a sentence safe to show in the interface. */
export function describeAuthError(error) {
  if (!error) return 'Something went wrong. Please try again.';

  if (error.code === 'supabase_not_configured' || error.kind === 'ENVIRONMENT_ERROR') {
    return describeServiceError(error);
  }

  // Network, database or permission failures carry their own sentence.
  if (error.kind && error.kind !== 'AUTH_ERROR') return describeServiceError(error);

  const code = typeof error.code === 'string' ? error.code : '';
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];

  const message = String(error.message ?? '');

  // OAuth failures arrive on the redirect URL rather than as an AuthError.
  if (/access_denied|denied by/i.test(message)) {
    return 'The sign-in was cancelled or denied.';
  }
  if (/invalid login credentials/i.test(message)) return ERROR_MESSAGES.invalid_credentials;
  if (/already (been )?registered|already exists/i.test(message)) return ERROR_MESSAGES.user_already_exists;
  if (/password should be at least|password is too short/i.test(message)) return ERROR_MESSAGES.weak_password;
  if (/invalid email|email address .* is invalid/i.test(message)) return ERROR_MESSAGES.invalid_email;
  if (/rate limit|too many|429/i.test(message)) return ERROR_MESSAGES.too_many_requests;
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  if (/jwt|token/i.test(message)) return ERROR_MESSAGES.session_not_found;

  return 'Something went wrong. Please try again.';
}

/** Throws the shared "not configured" error when Supabase is unavailable. */
function guard() {
  return requireSupabase();
}

/* -------------------------------------------------------------------------- */
/* Profiles                                                                    */
/* -------------------------------------------------------------------------- */

/** Provider name as shown in the UI. */
export function providerLabel(provider) {
  const labels = { email: 'Email & password', google: 'Google', facebook: 'Facebook' };
  return labels[provider] ?? (provider ? provider[0].toUpperCase() + provider.slice(1) : 'Email & password');
}

/**
 * Best display name available for a Supabase user, from OAuth metadata first
 * and the sign-up form second.
 */
function displayNameFrom(user) {
  const meta = user?.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    meta.real_name ||
    user?.user_metadata?.email ||
    user?.email ||
    'Recipe lover'
  );
}

function avatarFrom(user) {
  const meta = user?.user_metadata ?? {};
  return meta.avatar_url || meta.picture || meta.photo || null;
}

function providerFrom(user) {
  return user?.app_metadata?.provider || 'email';
}

/**
 * Creates or refreshes the `profiles` row for `user`.
 *
 * Runs on every sign-in, so a Google or Facebook account that was created
 * before its profile row existed is repaired on the next visit, and a changed
 * avatar is picked up. Only the caller's own row is ever written — the `id`
 * comes from the session, never from the UI, and RLS enforces the same rule.
 *
 * Returns the profile, or `null` when it could not be read or written.
 */
export async function ensureProfile(user) {
  if (!user) return null;
  const client = guard();

  const row = {
    id: user.id,
    full_name: displayNameFrom(user),
    avatar_url: avatarFrom(user),
    provider: providerFrom(user),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await client
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select('id, full_name, avatar_url, provider, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  } catch {
    // The profile row is cosmetic; a failure here must never block a sign-in.
    return null;
  }
}

/** Reads the signed-in user's profile row, or `null`. */
export async function getProfile(userId) {
  if (!userId) return null;
  const client = guard();

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, avatar_url, provider, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Email + password                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Signs in with an email and password.
 * @returns {Promise<import('@supabase/supabase-js').Session>}
 */
export async function signInWithEmail({ email, password }) {
  const client = guard();

  const { data, error } = await client.auth.signInWithPassword({
    email: String(email ?? '').trim(),
    password: String(password ?? ''),
  });

  if (error) {
    error.message = describeAuthError(error);
    throw error;
  }

  await ensureProfile(data.user);
  return data.session;
}

/**
 * Registers a new email/password account and its profile.
 *
 * When the project requires email confirmation there is no session yet, so
 * the profile is created by the database trigger instead and the caller is
 * told to check their inbox.
 *
 * @returns {Promise<{session: object|null, needsConfirmation: boolean}>}
 */
export async function signUpWithEmail({ fullName, email, password }) {
  const client = guard();
  const name = String(fullName ?? '').trim();

  const { data, error } = await client.auth.signUp({
    email: String(email ?? '').trim(),
    password: String(password ?? ''),
    options: { data: { full_name: name } },
  });

  if (error) {
    error.message = describeAuthError(error);
    throw error;
  }

  // Supabase returns a user without a session when sign-ups must be confirmed;
  // some deployments also return an obfuscated user for a duplicate email.
  if (data.session && data.user) {
    await ensureProfile({ ...data.user, user_metadata: { ...data.user.user_metadata, full_name: name } });
  }

  return { session: data.session, needsConfirmation: !data.session };
}

/* -------------------------------------------------------------------------- */
/* OAuth                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Starts a Google or Facebook sign-in.
 *
 * `from` is the path the visitor came from (`/recipe/52772`), carried on the
 * return URL so `/auth/callback` can send them straight back after
 * authorising.
 */
export async function signInWithOAuth(provider, { from = '/' } = {}) {
  const client = guard();

  const redirectTo = `${appUrl('auth/callback')}?from=${encodeURIComponent(from)}`;

  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes: provider === 'facebook' ? 'email,public_profile' : undefined },
  });

  if (error) {
    const name = provider === 'google' ? 'Google' : 'Facebook';
    const described = describeAuthError(error);
    // A failure nobody can act on names the provider, so the screen never
    // shows a bare "Something went wrong".
    error.message =
      described === 'Something went wrong. Please try again.'
        ? `${name} login failed. Please try again.`
        : described;
    throw error;
  }
}

/**
 * Reads an OAuth failure off the current URL.
 *
 * A provider that denies access returns `#error=access_denied...` rather than
 * a session, and nothing else in the app would surface it.
 *
 * @returns {string|null} a user-facing message, or null when the URL is clean.
 */
export function readOAuthErrorFromUrl() {
  if (typeof window === 'undefined') return null;

  const raw = `${window.location.hash ?? ''}&${window.location.search ?? ''}`;
  const params = new URLSearchParams(raw.replace(/^#/, ''));

  const code = params.get('error_code') || params.get('error');
  if (!code) return null;

  if (/access_denied/i.test(code) || /access_denied/i.test(params.get('error_description') ?? '')) {
    return 'The sign-in was cancelled or denied.';
  }
  if (/provider/i.test(code)) {
    return 'That sign-in provider could not be reached. Please try again.';
  }
  return 'Sign-in failed. Please try again.';
}

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

/** The current session, or `null` — reads never throw. */
async function readSession(client) {
  try {
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
  } catch {
    return null;
  }
}

/** The OAuth `?code=` still sitting on the URL, if there is one. */
function pendingOAuthCode() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('code');
}

/**
 * Exchanges an OAuth return code for a session (PKCE returns), if the URL
 * still carries one that `detectSessionInUrl` has not already consumed.
 *
 * @returns {Promise<object|null>} the session, or null.
 */
export async function exchangeOAuthCode() {
  const client = guard();
  const code = pendingOAuthCode();
  if (!code) return null;

  try {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return data?.session ?? null;
  } catch {
    // Already exchanged, or the verifier is gone: the listener below decides.
    return null;
  }
}

/**
 * Waits until the Supabase session exists after an OAuth redirect.
 *
 * Google and Facebook return either tokens in the URL hash (implicit) or a
 * `?code=` to exchange (PKCE). `detectSessionInUrl` handles the first shape on
 * its own, but the callback page must never conclude "signed out" while that
 * is still in flight — so this resolves as soon as a session shows up, and
 * gives up (returning `null`) only after `timeoutMs`.
 *
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<object|null>} the session, or null when none arrived.
 */
export async function waitForAuthSession({ timeoutMs = 10000 } = {}) {
  const client = guard();

  const existing = await readSession(client);
  if (existing) return existing;

  const exchanged = await exchangeOAuthCode();
  if (exchanged) return exchanged;

  const afterExchange = await readSession(client);
  if (afterExchange) return afterExchange;

  return new Promise((resolve) => {
    let settled = false;
    let subscription = null;
    let timer = null;
    let poll = null;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      if (poll) window.clearInterval(poll);
      subscription?.unsubscribe();
      resolve(value);
    };

    try {
      const result = client.auth.onAuthStateChange((_event, nextSession) => {
        if (nextSession) finish(nextSession);
      });
      subscription = result.data.subscription;
    } catch {
      // No listener available: the poll below still settles this promise.
    }

    poll = window.setInterval(async () => {
      const session = await readSession(client);
      if (session) finish(session);
    }, 250);

    timer = window.setTimeout(() => finish(null), timeoutMs);
  });
}

/** Signs the current user out. Safe to call when nobody is signed in. */
export async function signOut() {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    error.message = describeAuthError(error);
    throw error;
  }
}

/** Sends a password-reset link to `email`. */
export async function sendPasswordReset(email) {
  const client = guard();

  const { error } = await client.auth.resetPasswordForEmail(String(email ?? '').trim(), {
    redirectTo: appUrl('reset-password'),
  });

  if (error) {
    error.message = describeAuthError(error);
    throw error;
  }
}

/** Sets a new password for the session created by a recovery link. */
export async function updatePassword(password) {
  const client = guard();

  const { error } = await client.auth.updateUser({ password: String(password ?? '') });
  if (error) {
    error.message = describeAuthError(error);
    throw error;
  }
}
