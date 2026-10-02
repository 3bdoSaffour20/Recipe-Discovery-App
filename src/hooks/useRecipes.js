import { useCallback } from 'react';
import * as mealApi from '../services/mealApi';
import { useAsync } from './useAsync';
import { normalizeMeal } from '../utils/helpers';

/**
 * Loads a list of meals and returns them normalised for rendering.
 *
 * Wraps `useAsync` so pages do not each repeat the "call the API, map the
 * result" plumbing. The loader receives the `AbortSignal` created by
 * `useAsync`, so a superseded request is cancelled rather than merely ignored.
 *
 * @param {() => Promise<object[]>} loader
 * @param {unknown[]} deps Controls when the list is re-fetched.
 * @param {{enabled?: boolean, limit?: number}} [options]
 */
export function useRecipes(loader, deps = [], options = {}) {
  const { limit, enabled = true } = options;

  const query = useCallback(async () => {
    const meals = await loader();
    const normalised = meals.map(normalizeMeal).filter((meal) => meal && meal.id);

    return limit ? normalised.slice(0, limit) : normalised;
    // `loader` is intentionally excluded: callers pass inline arrow
    // functions, and `deps` already controls when to re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, ...deps]);

  const { data, error, isLoading, isIdle, refetch } = useAsync(query, deps, {
    enabled,
  });

  return { recipes: data ?? [], error, isLoading, isIdle, refetch };
}

/** Featured recipes for the Recipes listing. */
export function useFeaturedRecipes(limit = 24) {
  return useRecipes(() => mealApi.getFeaturedMeals(limit), [limit], { limit });
}


/** Recipes matching a free-text search term. Stays idle while empty. */
export function useSearchRecipes(query) {
  const term = String(query ?? '').trim();

  return useRecipes(() => mealApi.searchMeals(term), [term], {
    enabled: term.length > 0,
  });
}


/**
 * Categories from `categories.php`, mapped to the shape CategoryCard expects.
 */
export function useCategories() {
  const query = useCallback(async () => {
    const categories = await mealApi.getCategories();

    return categories.map((category) => ({
      id: category?.idCategory ?? category?.strCategory ?? '',
      name: category?.strCategory ?? '',
      description: category?.strCategoryDescription ?? '',
      image: category?.strCategoryThumb ?? '',
    }));
  }, []);

  const { data, error, isLoading, refetch } = useAsync(query, []);
  return { categories: data ?? [], error, isLoading, refetch };
}
/** Category names for the filter dropdown. */
export function useCategoryNames() {
  const query = useCallback(async () => {
    const names = await mealApi.listCategories();
    return names.length ? names : [];
  }, []);

  const { data, error, isLoading } = useAsync(query, []);
  return { categories: data ?? [], error, isLoading };
}

/** Ingredient names for the filter dropdown. */
export function useIngredientNames() {
  const query = useCallback(async () => {
    const names = await mealApi.listIngredients();
    return names.length ? names : [];
  }, []);

  const { data, error, isLoading } = useAsync(query, []);
  return { ingredients: data ?? [], error, isLoading };
}

/** A single full meal record for the detail page. */
export function useRecipeDetails(id) {
  const value = String(id ?? '').trim();

  const query = useCallback(async () => normalizeMeal(await mealApi.getMealDetails(value)), [value]);

  const { data, error, isLoading, refetch } = useAsync(query, [value], {
    enabled: value.length > 0,
  });

  return { recipe: data, error, isLoading, refetch };
}

/** A single random meal, re-rolled on demand via `reload`. */
export function useRandomMeal() {
  const query = useCallback(async () => normalizeMeal(await mealApi.getRandomMeal()), []);

  const { data, error, isLoading, refetch } = useAsync(query, []);
  return { recipe: data, error, isLoading, reload: refetch };
}

export default useRecipes;
