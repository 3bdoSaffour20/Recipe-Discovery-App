import { createClient } from '@supabase/supabase-js';

/**
 * The single Supabase client.
 *
 * Authentication (email, Google, Facebook), profiles, ratings and comments all
 * go through *this* module — `authService.js` and `reviewService.js` import the
 * same `supabase` object, so there is never a second client with its own
 * session, its own storage key or its own idea of who is signed in.
 *
 * The URL and key come from the environment (`VITE_SUPABASE_URL`,
 * `VITE_SUPABASE_ANON_KEY`) and are never hard-coded. Only the public
 * anon/publishable key belongs in a browser bundle; the service-role key must
 * never appear here, in `.env` or in any file shipped to the client — every
 * protection comes from Row Level Security in the database.
 *
 * Four states are kept distinct all the way to the UI, so a missing table is
 * never reported as "add your keys":
 *
 *   A. environment variables missing      → ENVIRONMENT_ERROR
 *   B. connected, table not created yet   → DATABASE_ERROR
 *   C. connected, permissions block it    → RLS_ERROR
 *   D. connected, query failed / offline  → NETWORK_ERROR / DATABASE_ERROR
 */

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Strips whitespace and the stray quotes some editors add around values. */
function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

const SUPABASE_URL = normalize(rawUrl);
const SUPABASE_ANON_KEY = normalize(rawKey);

/** The values in `.env.example` — templates, not credentials. */
const PLACEHOLDER =
  /your[-_](project|supabase|anon|public|publishable)|project-ref|anon-public-key|anon_or_publishable/i;

function usableUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * True only when both variables hold something that can actually work:
 * present, well-formed and not left over from the template.
 *
 * This reads `import.meta.env` directly rather than a second boolean that a
 * component could forget to update, so a signed-in user with a working project
 * can never be told that reviews "are not set up".
 */
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    usableUrl(SUPABASE_URL) &&
    !PLACEHOLDER.test(SUPABASE_URL) &&
    !PLACEHOLDER.test(SUPABASE_ANON_KEY),
);

/* -------------------------------------------------------------------------- */
/* User-facing messages, one per state                                        */
/* -------------------------------------------------------------------------- */

export const SUPABASE_MESSAGES = {
  ENVIRONMENT_ERROR:
    'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'to .env.local and restart the development server.',
  DATABASE_ERROR:
    'The review database table has not been created yet. Run the SQL from ' +
    'supabase/migrations in the Supabase SQL Editor.',
  DATABASE_QUERY_ERROR:
    'The review service could not read the database right now. Please try again.',
  RLS_ERROR: 'You are connected to Supabase, but database permissions need to be configured.',
  NETWORK_ERROR: 'Unable to connect to the review service. Please try again.',
  AUTH_ERROR: 'Please sign in again to continue.',
  VALIDATION_ERROR: 'Please check your input and try again.',
};

/** Shown wherever an auth/review action runs without configuration. */
export const NOT_CONFIGURED_MESSAGE = SUPABASE_MESSAGES.ENVIRONMENT_ERROR;

/* -------------------------------------------------------------------------- */
/* Client                                                                      */
/* -------------------------------------------------------------------------- */

function buildClient() {
  if (!isSupabaseConfigured) return null;

  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Supabase owns the session: it is persisted, refreshed automatically
        // and restored on reload. `sessionStorage` (not `localStorage`) is
        // deliberate — the app keeps no account data on disk, the token
        // disappears when the tab does, and a reload in the same tab stays
        // signed in.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        storageKey: 'recipe-discovery:auth',
      },
    });
  } catch (error) {
    // A malformed URL must not take the whole app down; recipes, search and
    // categories keep working without a database.
    if (import.meta.env.DEV) {
      console.warn('Supabase client could not be created:', error?.message);
    }
    return null;
  }
}

/**
 * The shared client, or `null` when the project is not configured.
 *
 * Callers should branch on `isSupabaseConfigured` first; `requireSupabase`
 * exists so a missed branch still fails loudly with a readable message.
 */
export const supabase = buildClient();

/** @returns {import('@supabase/supabase-js').SupabaseClient} */
export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    const error = new Error(NOT_CONFIGURED_MESSAGE);
    error.kind = 'ENVIRONMENT_ERROR';
    error.code = 'supabase_not_configured';
    throw error;
  }
  return supabase;
}

/**
 * Absolute URL for a path inside this app.
 *
 * Used as the OAuth / password-reset return target, which must be an exact
 * match (or wildcard) of the redirect URLs allowed in the Supabase dashboard.
 */
export function appUrl(path = '/') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = import.meta.env.BASE_URL || '/';

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = String(path || '/').replace(/^\/+/, '');

  return `${origin}${normalizedBase}${normalizedPath}`;
}

/* -------------------------------------------------------------------------- */
/* Error classification                                                        */
/* -------------------------------------------------------------------------- */

/** The six states the UI tells apart. */
export const ERROR_KINDS = [
  'ENVIRONMENT_ERROR',
  'AUTH_ERROR',
  'DATABASE_ERROR',
  'RLS_ERROR',
  'NETWORK_ERROR',
  'VALIDATION_ERROR',
];

const NETWORK_PATTERN =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|econnrefused|etimedout|network error|socket hang up/i;

const RLS_PATTERN =
  /row-level security|permission denied|insufficient privilege|violates .*policy|not authorized|not allowed/i;

const MISSING_TABLE_PATTERN =
  /could not find the table|relation .* does not exist|does not exist in the schema cache|undefined_table/i;

const VALIDATION_CODES = new Set(['23505', '23514', '23502', '22P02', '22001', '22003']);

const AUTH_CODES = new Set([
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'email_exists',
  'weak_password',
  'validation_failed',
  'invalid_email',
  'over_email_send_rate_limit',
  'too_many_requests',
  'signup_disabled',
  'user_not_found',
  'provider_email_needs_verification',
  'session_not_found',
  'refresh_token_not_found',
  'access_denied',
  'unexpected_failure',
]);

/** True when the error says the table itself is missing from the schema. */
export function isMissingTableError(error) {
  const code = String(error?.code ?? '');
  return code === 'PGRST205' || code === '42P01' || MISSING_TABLE_PATTERN.test(String(error?.message ?? ''));
}

/**
 * Maps a raw Supabase / PostgREST / fetch failure onto one of the six kinds.
 * Nothing here is ever shown to a visitor directly — `describeServiceError`
 * turns the kind into a sentence.
 *
 * @param {unknown} error
 * @returns {(typeof ERROR_KINDS)[number]}
 */
export function classifySupabaseError(error) {
  if (!error) return 'DATABASE_ERROR';
  if (error.kind && ERROR_KINDS.includes(error.kind)) return error.kind;
  if (!isSupabaseConfigured) return 'ENVIRONMENT_ERROR';
  if (error.code === 'supabase_not_configured') return 'ENVIRONMENT_ERROR';

  const code = String(error.code ?? error.error_code ?? '');
  const message = String(error.message ?? error.error_description ?? '');
  const status = Number(error.status ?? error.statusCode ?? 0);

  if (error instanceof TypeError || NETWORK_PATTERN.test(message)) return 'NETWORK_ERROR';

  if (
    error.name === 'AuthError' ||
    AUTH_CODES.has(code) ||
    /access_denied|invalid login credentials|jwt|token/i.test(message)
  ) {
    return 'AUTH_ERROR';
  }

  if (code === '42501' || code === 'PGRST301' || status === 401 || status === 403 || RLS_PATTERN.test(message)) {
    return 'RLS_ERROR';
  }

  if (VALIDATION_CODES.has(code) || /duplicate key|check constraint|not-null|too long/i.test(message)) {
    return 'VALIDATION_ERROR';
  }

  if (isMissingTableError(error)) return 'DATABASE_ERROR';

  return 'DATABASE_ERROR';
}

/** Builds an error that already carries a kind and a human sentence. */
export function createServiceError(kind, message, cause = null) {
  const error = new Error(message);
  error.kind = kind;
  error.code = kind === 'ENVIRONMENT_ERROR' ? 'supabase_not_configured' : (cause?.code ?? kind);
  if (cause) error.cause = cause;
  return error;
}

function messageFor(kind, error) {
  switch (kind) {
    case 'ENVIRONMENT_ERROR':
      return NOT_CONFIGURED_MESSAGE;
    case 'NETWORK_ERROR':
      return SUPABASE_MESSAGES.NETWORK_ERROR;
    case 'RLS_ERROR':
      return SUPABASE_MESSAGES.RLS_ERROR;
    case 'VALIDATION_ERROR':
      return SUPABASE_MESSAGES.VALIDATION_ERROR;
    case 'AUTH_ERROR':
      // Supabase's auth messages are already written for people; authService
      // refines them further for the sign-in screens.
      return error?.message || SUPABASE_MESSAGES.AUTH_ERROR;
    case 'DATABASE_ERROR':
      return isMissingTableError(error)
        ? SUPABASE_MESSAGES.DATABASE_ERROR
        : SUPABASE_MESSAGES.DATABASE_QUERY_ERROR;
    default:
      return SUPABASE_MESSAGES.DATABASE_QUERY_ERROR;
  }
}

/**
 * Wraps any thrown value into an error with a `kind` and a message that is
 * safe to show. Already-classified errors pass through untouched, so a
 * validation message written for the visitor is never replaced.
 *
 * `overrides` maps a database error code (for example `23505`) to a specific
 * sentence.
 *
 * @param {unknown} error
 * @param {Record<string, string>} [overrides]
 * @returns {Error & {kind: string}}
 */
export function toServiceError(error, overrides = {}) {
  if (!error) return createServiceError('DATABASE_ERROR', SUPABASE_MESSAGES.DATABASE_QUERY_ERROR);
  if (error.kind && ERROR_KINDS.includes(error.kind)) return error;

  const kind = classifySupabaseError(error);
  const code = typeof error.code === 'string' ? error.code : '';
  const message = overrides[code] ?? messageFor(kind, error);

  return createServiceError(kind, message, error);
}

/** A sentence a person can act on, for any error the services can throw. */
export function describeServiceError(error) {
  return toServiceError(error).message;
}

/** Builds a validation error from a message already written for the visitor. */
export function validationError(message) {
  return createServiceError('VALIDATION_ERROR', message);
}

/** Builds an authentication error, e.g. the "please log in" gate. */
export function authError(message) {
  return createServiceError('AUTH_ERROR', message);
}

/* -------------------------------------------------------------------------- */
/* Connection check                                                            */
/* -------------------------------------------------------------------------- */

let connectionCheck = null;

/**
 * Verifies the four things the review system needs, once per page load.
 *
 * @returns {Promise<{
 *   configured: boolean,
 *   authenticated: boolean,
 *   databaseAvailable: boolean,
 *   kind: string|null,
 *   message: string|null,
 *   loading: boolean,
 * }>} A structured result — no key, token or raw driver message ever
 *   leaves this function.
 */
export function checkSupabaseConnection({ force = false } = {}) {
  if (force) connectionCheck = null;
  if (!connectionCheck) {
    connectionCheck = runConnectionCheck().catch((error) => {
      const kind = classifySupabaseError(error);
      return {
        configured: isSupabaseConfigured && Boolean(supabase),
        authenticated: false,
        databaseAvailable: false,
        kind,
        message: messageFor(kind, error),
      };
    });
  }
  return connectionCheck;
}

async function runConnectionCheck() {
  const base = {
    configured: isSupabaseConfigured && Boolean(supabase),
    authenticated: false,
    databaseAvailable: false,
    kind: null,
    message: null,
  };

  if (!base.configured) {
    return { ...base, kind: 'ENVIRONMENT_ERROR', message: NOT_CONFIGURED_MESSAGE };
  }

  // 1. Can a session be read at all? A network failure here stops the probe;
  //    a signed-out visitor is a perfectly healthy state.
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    base.authenticated = Boolean(data?.session);
  } catch (error) {
    const kind = classifySupabaseError(error);
    if (kind === 'NETWORK_ERROR') {
      return { ...base, kind, message: SUPABASE_MESSAGES.NETWORK_ERROR };
    }
  }

  // 2. Is the reviews table there and readable? Reads are public by design,
  //    so a failure here means the schema or the grants are incomplete.
  try {
    const { error } = await supabase
      .from('recipe_reviews')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    base.databaseAvailable = true;
    return base;
  } catch (error) {
    const kind = classifySupabaseError(error);

    if (kind === 'RLS_ERROR') {
      return {
        ...base,
        databaseAvailable: true,
        kind: 'RLS_ERROR',
        message: SUPABASE_MESSAGES.RLS_ERROR,
      };
    }
    if (kind === 'NETWORK_ERROR') {
      return { ...base, kind, message: SUPABASE_MESSAGES.NETWORK_ERROR };
    }
    if (isMissingTableError(error)) {
      return {
        ...base,
        databaseAvailable: false,
        kind: 'DATABASE_ERROR',
        message: SUPABASE_MESSAGES.DATABASE_ERROR,
      };
    }
    return {
      ...base,
      kind: 'DATABASE_ERROR',
      message: SUPABASE_MESSAGES.DATABASE_QUERY_ERROR,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Development diagnostics                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Development-only console summary. Logs *whether* a value exists, never the
 * value itself — no key, no token, no URL — and never runs in production.
 */
export function logSupabaseDiagnostics(session = null) {
  if (!import.meta.env.DEV) return;

  console.group('Supabase Diagnostics');
  console.log('Supabase URL configured:', Boolean(SUPABASE_URL));
  console.log('Supabase public key configured:', Boolean(SUPABASE_ANON_KEY));
  console.log('Session available:', Boolean(session));
  console.groupEnd();
}
