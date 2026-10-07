/**
 * Redirect targets after signing in or registering.
 *
 * The return path arrives from the login gate (`location.state.from`) or from
 * the query string (`?redirect=` / the OAuth `?from=`), and in both cases it
 * is attacker-influenceable input. Only same-origin paths are honoured —
 * `//evil.example` and `https://…` are rejected — so a crafted link can never
 * bounce a signed-in user to another site.
 */

/** A path inside this app, or `/` when the candidate is unsafe. */
export function safeReturnPath(candidate) {
  const value = String(candidate ?? '').trim();

  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  if (value.startsWith('/\\')) return '/';

  return value;
}

/** Reads the return path from router state, then from the query string. */
export function readReturnPath(location, searchParams) {
  const fromQuery =
    searchParams?.get('redirect') ?? searchParams?.get('from') ?? null;

  return safeReturnPath(location?.state?.from ?? fromQuery ?? '/');
}

export default safeReturnPath;
