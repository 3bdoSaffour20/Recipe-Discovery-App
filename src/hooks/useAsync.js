import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async function and tracks its lifecycle.
 *
 * Handles the four states every data view needs — idle, loading, error and
 * success — plus two things that are easy to get wrong by hand:
 *
 *   - a late response from a superseded request can never overwrite newer
 *     state (each run gets a token, and stale tokens are discarded);
 *   - state is never written after unmount, so React never warns about
 *     setting state on an unmounted component.
 *
 * @param {(signal: AbortSignal) => Promise<T>} asyncFn
 * @param {unknown[]} deps Re-runs the effect when these change, like useEffect.
 * @param {{enabled?: boolean, initialData?: T}} [options]
 * @returns {{
 *   data: T,
 *   error: Error|null,
 *   isLoading: boolean,
 *   isIdle: boolean,
 *   refetch: () => void
 * }}
 * @template T
 */
export function useAsync(asyncFn, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);

  // Refs let the effect read the latest callback without listing it as a
  // dependency, which would re-run on every parent render.
  const callbackRef = useRef(asyncFn);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [reloadToken, setReloadToken] = useState(0);

  callbackRef.current = asyncFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const controller = new AbortController();
    let isCurrent = true;

    setIsLoading(true);
    setError(null);

    Promise.resolve()
      .then(() => callbackRef.current(controller.signal))
      .then((result) => {
        // Discard the response if a newer run started, or we unmounted.
        if (!isCurrent || runIdRef.current !== runId || !mountedRef.current) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((caught) => {
        if (!isCurrent || runIdRef.current !== runId || !mountedRef.current) return;
        // An aborted request is an intentional cancellation, not a failure.
        if (caught?.name === 'AbortError') return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, ...deps]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return {
    data,
    error,
    isLoading,
    isIdle: !enabled && data === initialData,
    refetch,
  };
}
