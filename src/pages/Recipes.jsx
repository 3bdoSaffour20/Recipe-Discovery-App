import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { RecipeGrid } from '../components/RecipeGrid';
import { SearchBar } from '../components/SearchBar';
import { useRatingsFor } from '../context/RatingsContext';
import { useCategoryNames, useIngredientNames, useRecipes } from '../hooks/useRecipes';
import * as mealApi from '../services/mealApi';

/** How many meals the unfiltered listing shows. */
const FEATURED_LIMIT = 48;

/**
 * Sort orders offered alongside the category and ingredient filters.
 *
 * The value lives in `?sort=`, so a sorted view is shareable and survives a
 * refresh exactly like a filter does.
 */
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'lowest', label: 'Lowest Rated' },
];

/** `dateModified` is a string some records carry and others simply lack. */
function modifiedTime(recipe) {
  const parsed = Date.parse(recipe?.dateModified ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Recipes listing, filterable by category or main ingredient.
 *
 * The filter lives in the URL (`?category=Beef`, `?ingredient=chicken_breast`)
 * so a filtered view is shareable and survives a refresh. One hook drives the
 * list and picks its endpoint from the active filter, so changing a filter
 * always costs exactly one request.
 *
 * Sorting reorders the loaded batch rather than asking TheMealDB for a
 * different list: ratings come from the shared cache (so a recipe that gains a
 * rating re-sorts in place) and recipes with no ratings yet always sort last
 * instead of pretending to be a zero.
 */
export function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') ?? '';
  const ingredient = searchParams.get('ingredient') ?? '';
  const sort = SORT_OPTIONS.some((option) => option.value === searchParams.get('sort'))
    ? searchParams.get('sort')
    : 'featured';

  const { categories } = useCategoryNames();
  const { ingredients } = useIngredientNames();

  const loader = useCallback(() => {
    if (ingredient) return mealApi.getMealsByIngredient(ingredient);
    if (category) return mealApi.getMealsByCategory(category);
    return mealApi.getFeaturedMeals(FEATURED_LIMIT);
  }, [category, ingredient]);

  const { recipes, error, isLoading, refetch } = useRecipes(loader, [category, ingredient]);

  const { ratings } = useRatingsFor(recipes.map((recipe) => recipe.id));

  const sortedRecipes = useMemo(() => {
    if (sort === 'featured') return recipes;

    const stats = (id) => ratings[id] ?? { average: null, count: 0 };
    const sorted = [...recipes];

    sorted.sort((a, b) => {
      if (sort === 'newest') return modifiedTime(b) - modifiedTime(a);

      const left = stats(a.id);
      const right = stats(b.id);

      if (sort === 'popular') {
        return (
          right.count - left.count ||
          (Number(right.average) || 0) - (Number(left.average) || 0)
        );
      }

      // Rated recipes come first; only then do the averages decide.
      const ratedLeft = left.count > 0;
      const ratedRight = right.count > 0;
      if (ratedLeft !== ratedRight) return ratedLeft ? -1 : 1;

      const delta = (Number(left.average) || 0) - (Number(right.average) || 0);
      return sort === 'lowest' ? delta : -delta;
    });

    return sorted;
  }, [recipes, ratings, sort]);

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

  function setSort(value) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'featured') next.set('sort', value);
    else next.delete('sort');

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

          <label className="sr-only" htmlFor="sort-filter">
            Sort recipes
          </label>
          <select
            id="sort-filter"
            className="select toolbar__select"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <RecipeGrid
        items={sortedRecipes}
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