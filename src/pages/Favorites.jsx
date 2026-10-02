import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { RecipeGrid } from '../components/RecipeGrid';
import { useFavorites } from '../hooks/useFavorites';
import { useRecipes } from '../hooks/useRecipes';
import * as mealApi from '../services/mealApi';

/**
 * Saved recipes.
 *
 * Only ids are persisted, so each visit re-fetches the current records rather
 * than showing a frozen snapshot — and a recipe that TheMealDB has since
 * changed comes back up to date.
 */
export function Favorites() {
  const { favoriteIds, favoriteCount, clearFavorites } = useFavorites();

  const loader = async () => {
    // Reuse the shared store, so opening a favourite from here is instant if
    // it has already been loaded this session.
    const meals = await Promise.all(favoriteIds.map((id) => mealApi.getMealDetails(id)));
    return meals.filter(Boolean);
  };

  const { recipes, error, isLoading, refetch } = useRecipes(loader, [favoriteIds.join(',')], {
    enabled: favoriteCount > 0,
  });

  // Nothing saved: no need to have requested anything at all.
  if (favoriteCount === 0) {
    return (
      <>
        <header className="page-header">
          <span className="page-header__eyebrow">Saved</span>
          <h1 className="page-header__title">Your Favourites</h1>
          <p className="page-header__description">
            Recipes you save are stored on this device and are still here when
            you come back.
          </p>
        </header>

        <EmptyState
          title="No favourites yet."
          message="Tap the heart on any recipe to save it here."
          action={
            <div className="cluster gap-3 mt-2">
              <Link className="btn btn--primary" to="/recipes">
                Explore recipes
              </Link>
              <RandomRecipeButton className="btn btn--accent" />
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <span className="page-header__eyebrow">Saved</span>
        <h1 className="page-header__title">Your Favourites</h1>
        <p className="page-header__description">
          {favoriteCount} {favoriteCount === 1 ? 'recipe' : 'recipes'} saved on
          this device.
        </p>
      </header>

      <RecipeGrid
        items={recipes}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        emptyTitle="No favourites yet."
        emptyMessage="Tap the heart on any recipe to save it here."
      />

      <div className="cluster cluster--center gap-4 mt-8">
        <button type="button" className="btn btn--ghost" onClick={clearFavorites}>
          Clear all favourites
        </button>
      </div>
    </>
  );
}

export default Favorites;