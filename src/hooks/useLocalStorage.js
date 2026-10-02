import { useCallback, useEffect, useState } from 'react';

/**
 * `useState` backed by localStorage.
 *
 * Reads lazily on first render, writes on change, and stays in sync with other
 * tabs via the `storage` event. Every access is wrapped because Safari in
 * private mode throws on `localStorage`, and because a user may have blocked
 * storage entirely — in both cases the app degrades to in-memory state rather
 * than crashing.
 *
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((previous: T) => T)) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => readValue(key, initialValue));

  const setValue = useCallback(
    (value) => {
      setStoredValue((previous) => {
        const next = value instanceof Function ? value(previous) : value;

        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage unavailable (private mode, quota, blocked cookies):
          // keep the in-memory value so the UI still behaves correctly.
        }

        return next;
      });
    },
    [key],
  );

  useEffect(() => {
    function handleStorage(event) {
      // Ignore other keys and same-tab writes, which do not fire this event.
      if (event.key !== key || event.storageArea !== window.localStorage) return;
      setStoredValue(readValue(key, initialValue));
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // `initialValue` is a default, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [storedValue, setValue];
}

/** Reads and JSON-parses a key, falling back to `initialValue`. */
function readValue(key, initialValue) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    return JSON.parse(raw);
  } catch {
    return initialValue;
  }
}

export default useLocalStorage;