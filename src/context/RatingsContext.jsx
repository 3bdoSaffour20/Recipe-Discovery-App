import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRatingsForRecipes } from '../services/reviewService';
import { isSupabaseConfigured } from '../services/supabase';

const RatingsContext = createContext(null);

/** Coalesces every card that mounts in the same tick into one request. */
const FLUSH_DELAY_MS = 60;

/**
 * Shared cache of rating statistics.
 *
 * Every recipe card, the recipe detail page and the "sort by rating" control
 * need `AVG(rating)` + `COUNT(rating)` for the recipes on screen. Rather than
 * one request per card, ids are queued and flushed as a single batched query,
 * and results are remembered for the rest of the session.
 *
 * A failure here is deliberately non-blocking: the rest of the page keeps
 * working and the affected cards simply show no rating until a later request
 * retries them.
 */
export function RatingsProvider({ children }) {
  const [ratings, setRatings] = useState({});

  const loadedRef = useRef(new Set());
  const queueRef = useRef(new Set());
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flush = useCallback(async () => {
    const ids = [...queueRef.current];
    queueRef.current.clear();
    if (ids.length === 0) return;

    if (!isSupabaseConfigured) {
      // No database: every recipe has, verifiably, no ratings yet.
      const blank = {};
      for (const id of ids) {
        blank[id] = { average: null, count: 0 };
        loadedRef.current.add(id);
      }
      if (mountedRef.current) setRatings((current) => ({ ...current, ...blank }));
      return;
    }

    try {
      const map = await getRatingsForRecipes(ids);
      for (const id of ids) loadedRef.current.add(id);
      if (mountedRef.current) setRatings((current) => ({ ...current, ...map }));
    } catch (error) {
      // Left unloaded on purpose: a later `request` retries them.
      console.warn('Rating statistics unavailable:', error?.message);
    }
  }, []);

  const request = useCallback(
    (ids) => {
      let queued = false;

      for (const raw of ids ?? []) {
        const id = String(raw ?? '').trim();
        if (!id || loadedRef.current.has(id) || queueRef.current.has(id)) continue;
        queueRef.current.add(id);
        queued = true;
      }

      if (!queued) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        flush();
      }, FLUSH_DELAY_MS);
    },
    [flush],
  );

  /** Marks ids stale and re-fetches them — used after submitting a rating. */
  const invalidate = useCallback(
    (ids) => {
      for (const raw of ids ?? []) {
        const id = String(raw ?? '').trim();
        if (id) loadedRef.current.delete(id);
      }
      request(ids);
    },
    [request],
  );

  const getRating = useCallback(
    (id) => (id ? ratings[String(id)] ?? null : null),
    [ratings],
  );

  const value = useMemo(
    () => ({ ratings, request, invalidate, getRating }),
    [ratings, request, invalidate, getRating],
  );

  return <RatingsContext.Provider value={value}>{children}</RatingsContext.Provider>;
}

/**
 * Reads the ratings context.
 * @throws if used outside a RatingsProvider.
 */
export function useRatings() {
  const context = useContext(RatingsContext);

  if (!context) {
    throw new Error('useRatings must be used within a RatingsProvider.');
  }

  return context;
}

/**
 * Statistics for a single recipe.
 *
 * @param {string} recipeId TheMealDB `idMeal`
 * @returns {{rating: {average: number|null, count: number}|null, refresh: () => void}}
 */
export function useRecipeRating(recipeId) {
  const { request, invalidate, getRating } = useRatings();

  useEffect(() => {
    if (recipeId) request([recipeId]);
  }, [recipeId, request]);

  const refresh = useCallback(() => {
    if (recipeId) invalidate([recipeId]);
  }, [recipeId, invalidate]);

  return { rating: getRating(recipeId), refresh };
}

/**
 * Statistics for a set of recipes — the shape the Recipes page sorts with.
 *
 * @param {string[]} recipeIds
 * @returns {{ratings: Record<string, {average: number|null, count: number}>, isReady: boolean}}
 */
export function useRatingsFor(recipeIds) {
  const { request, getRating } = useRatings();

  // An array identity changes on every render; the joined key does not.
  const key = (recipeIds ?? []).map((id) => String(id ?? '')).join(',');

  useEffect(() => {
    if (!key) return;
    request(key.split(','));
  }, [key, request]);

  const ratings = useMemo(() => {
    const result = {};
    if (!key) return result;

    for (const id of key.split(',')) {
      const entry = getRating(id);
      if (entry) result[id] = entry;
    }
    return result;
  }, [key, getRating]);

  const ids = key ? key.split(',') : [];
  const isReady = ids.length > 0 && ids.every((id) => Boolean(ratings[id]));

  return { ratings, isReady };
}

export default RatingsProvider;
