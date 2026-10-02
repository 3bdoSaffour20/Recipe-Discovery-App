import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

const FavoritesContext = createContext(null);

/**
 * Favourite recipes, persisted to localStorage.
 *
 * Only recipe ids are stored, not whole records: TheMealDB is the source of
 * truth, so a stored id is re-fetched on load and a stale or edited entry can
 * never render outdated data.
 */
export function FavoritesProvider({ children }) {
  const [ids, setIds] = useLocalStorage('recipe-discovery:favorites', []);

  // Guards against a corrupt or hand-edited localStorage value.
  const favoriteIds = useMemo(
    () => (Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id) : []),
    [ids],
  );

  const isFavorite = useCallback((id) => favoriteIds.includes(String(id)), [favoriteIds]);

  const toggleFavorite = useCallback(
    (id) => {
      const key = String(id);
      setIds((current) => {
        const existing = Array.isArray(current) ? current : [];
        return existing.includes(key)
          ? existing.filter((value) => value !== key)
          : [...existing, key];
      });
    },
    [setIds],
  );

  const removeFavorite = useCallback(
    (id) => {
      const key = String(id);
      setIds((current) =>
        (Array.isArray(current) ? current : []).filter((value) => value !== key),
      );
    },
    [setIds],
  );

  const clearFavorites = useCallback(() => setIds([]), [setIds]);

  const value = useMemo(
    () => ({
      favoriteIds,
      favoriteCount: favoriteIds.length,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      clearFavorites,
    }),
    [favoriteIds, isFavorite, toggleFavorite, removeFavorite, clearFavorites],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/**
 * Reads the favourites context.
 * @throws if used outside a FavoritesProvider.
 */
export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider.');
  }

  return context;
}
