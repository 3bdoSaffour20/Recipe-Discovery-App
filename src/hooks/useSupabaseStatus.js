import { useCallback, useEffect, useState } from 'react';
import {
  checkSupabaseConnection,
  isSupabaseConfigured,
  NOT_CONFIGURED_MESSAGE,
} from '../services/supabase';

/**
 * The real state of the review backend, decided once per page load by
 * `checkSupabaseConnection()`:
 *
 *   {configured, authenticated, databaseAvailable, kind, message}
 *
 * `kind` is `null` when everything works, otherwise one of the six error
 * kinds — so a screen can say *"the review table has not been created yet"*
 * instead of blaming missing keys, and can say nothing at all when Supabase
 * is simply working.
 *
 * The unconfigured answer is synchronous (it reads `import.meta.env` on the
 * first render), so no component ever flashes a login gate or an empty state
 * before it knows which world it is in.
 */
export function useSupabaseStatus() {
  const [status, setStatus] = useState(() =>
    isSupabaseConfigured
      ? {
          loading: true,
          configured: true,
          authenticated: false,
          databaseAvailable: false,
          kind: null,
          message: null,
        }
      : {
          loading: false,
          configured: false,
          authenticated: false,
          databaseAvailable: false,
          kind: 'ENVIRONMENT_ERROR',
          message: NOT_CONFIGURED_MESSAGE,
        },
  );

  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    let cancelled = false;
    setStatus((current) => ({ ...current, loading: true }));

    checkSupabaseConnection({ force: reloadToken > 0 })
      .then((result) => {
        if (!cancelled) setStatus({ ...result, loading: false });
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus((current) => ({
            ...current,
            loading: false,
            kind: current.kind ?? 'NETWORK_ERROR',
            message: current.message ?? error?.message ?? null,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { ...status, refresh };
}

export default useSupabaseStatus;
