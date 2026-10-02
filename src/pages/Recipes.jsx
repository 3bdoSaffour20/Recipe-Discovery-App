import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { RecipeGrid } from '../components/RecipeGrid';
import { SearchBar } from '../components/SearchBar';
import { useCategoryNames, useIngredientNames, useRecipes } from '../hooks/useRecipes';
import * as mealApi from '../services/mealApi';

/** How many meals the unfiltered listing shows. */
const FEATURED_LIMIT = 48;

/**
 * Recipes listing, filterable by category or main ingredient.
 *
 * The filter lives in the URL (`?category=Beef`, `?ingredient=chicken_breast`)
 * so a filtered view is shareable and survives a refresh. One hook drives the
 * list and picks its endpoint from the active filter, so changing a filter
 * always costs exactly one request.
 */
export function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? '';
  const ingredient = searchParams.get('ingredient') ?? '';

  const { categories } = useCategoryNames();
  const { ingredients } = useIngredientNames();

  const loader = useCallback(() => {
    if (ingredient) return mealApi.getMealsByIngredient(ingredient);
    if (category) return mealApi.getMealsByCategory(category);
    return mealApi.getFeaturedMeals(FEATURED_LIMIT);
  }, [category, ingredient]);

  const { recipes, error, isLoading, refetch } = useRecipes(loader, [category, ingredient]);

  const isIngredientView = Boolean(ingredient);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);

    // A category and an ingredient filter are mutually exclusive.
    if (key === 'category') next.delete('ingredient');
    if (key === 'ingredient') next.delete('category');

    setSearchParams(next, { replace: true });
  }

  const heading = isIngredientView
    ? `Recipes with ${ingredient.replace(/_/g, ' ')}`
    : category
      ? `${category} Recipes`
      : 'Explore Recipes';

  const description = category
    ? `Every ${category.toLowerCase()} dish in the TheMealDB collection.`
    : isIngredientView
      ? 'Recipes whose main ingredient matches your selection.'
      : 'Browse dishes from every corner of the world, filtered by category or by the ingredient you have in mind.';

  return (
    <>
      <header className="page-header">
        <span className="page-header__eyebrow">TheMealDB collection</span>
        <h1 className="page-header__title">{heading}</h1>
        <p className="page-header__description">{description}</p>
      </header>

      <div className="container--narrow full-width mb-6">
        <SearchBar
          placeholder="Search for recipes..."
          label="Search all recipes"
          showLabel
          value={searchParams.get('query') ?? ''}
        />
      </div>

      <div className="toolbar">
        <p className="toolbar__meta">
          <strong>{recipes.length}</strong>{' '}
          {recipes.length === 1 ? 'recipe' : 'recipes'}
          {category ? ` in ${category}` : ''}
          {isIngredientView ? ` with ${ingredient.replace(/_/g, ' ')}` : ''}
        </p>

        <div className="toolbar__controls">
          <label className="sr-only" htmlFor="category-filter">
            Filter by category
          </label>
          <select
            id="category-filter"
            className="select toolbar__select"
            value={category}
            onChange={(event) => setFilter('category', event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="ingredient-filter">
            Filter by ingredient
          </label>
          <select
            id="ingredient-filter"
            className="select toolbar__select"
            value={ingredient}
            onChange={(event) => setFilter('ingredient', event.target.value)}
          >
            <option value="">Any ingredient</option>
            {ingredients.map((name) => (
              <option key={name} value={name}>
                {name.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <RecipeGrid
        items={recipes}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        emptyTitle={category || isIngredientView ? 'No recipes found.' : undefined}
        emptyMessage={
          category || isIngredientView
            ? 'Try another category or ingredient.'
            : undefined
        }
        emptyAction={
          <Link className="btn btn--secondary" to="/categories">
            Browse categories
          </Link>
        }
      />

      <div className="cluster cluster--center mt-8">
        <RandomRecipeButton />
      </div>
    </>
  );
}

export default Recipes;