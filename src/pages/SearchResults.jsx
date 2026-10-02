import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RecipeGrid } from '../components/RecipeGrid';
import { SearchBar } from '../components/SearchBar';
import { useSearchRecipes } from '../hooks/useRecipes';

/**
 * Search results for `?query=...`.
 *
 * The term in the field is local state so typing stays responsive; it is only
 * pushed into the URL on submit, which is what triggers the fetch. That
 * avoids a request per keystroke while still making the result shareable.
 */
export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('query') ?? '';

  const [term, setTerm] = useState(query);

  // Keep the field in step when the term changes via the back/forward buttons.
  useEffect(() => {
    setTerm(query);
  }, [query]);

  const { recipes, error, isLoading, refetch } = useSearchRecipes(query);

  function handleSearch(nextQuery) {
    setSearchParams({ query: nextQuery });
  }

  const heading = query ? `Search Results for "${query}"` : 'Search Recipes';

  return (
    <>
      <header className="page-header">
        <span className="page-header__eyebrow">Search</span>
        <h1 className="page-header__title">{heading}</h1>
        <p className="page-header__description">
          Searching recipe names across the whole TheMealDB collection.
        </p>
      </header>

      <div className="container--narrow full-width mb-6">
        <SearchBar
          value={term}
          onValueChange={setTerm}
          onSearch={handleSearch}
          label="Search for recipes"
          showLabel
          placeholder="Search for recipes..."
        />
      </div>

      {/* No term at all: prompt rather than showing an empty-result error. */}
      {!query ? (
        <div className="state">
          <h2 className="state__title">What are you cooking?</h2>
          <p className="state__message">
            Enter a recipe name above — try "pasta", "chicken" or "cake".
          </p>
          <div className="cluster gap-3 mt-2">
            <Link className="btn btn--secondary" to="/categories">
              Browse categories
            </Link>
            <Link className="btn btn--primary" to="/recipes">
              Explore recipes
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="toolbar__meta mb-4">
            <strong>{recipes.length}</strong>{' '}
            {recipes.length === 1 ? 'recipe' : 'recipes'} found for{' '}
            <strong>{query}</strong>
          </p>

          <RecipeGrid
            items={recipes}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            emptyTitle="No recipes found."
            emptyMessage="Try searching for another recipe."
            emptyAction={
              <Link className="btn btn--secondary" to="/categories">
                Browse categories instead
              </Link>
            }
          />
        </>
      )}
    </>
  );
}

export default SearchResults;