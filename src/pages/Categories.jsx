import { Link } from 'react-router-dom';
import { RecipeGrid } from '../components/RecipeGrid';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { useCategories } from '../hooks/useRecipes';

/**
 * Categories index.
 *
 * Rendered entirely from `categories.php`, so it grows with the API rather
 * than being hard-coded. Selecting a card navigates to
 * `/recipes?category=Name`.
 */
export function Categories() {
  const { categories, error, isLoading, refetch } = useCategories();

  return (
    <>
      <header className="page-header">
        <span className="page-header__eyebrow">Explore</span>
        <h1 className="page-header__title">Browse Categories</h1>
        <p className="page-header__description">
          Every category in the TheMealDB collection — from quick breakfasts to
          slow-cooked classics.
        </p>
      </header>

      <RecipeGrid
        items={categories}
        variant="category"
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={10}
        emptyTitle="No categories found."
        emptyMessage="We could not load the category list. Please try again."
      />

      <div className="cta-banner mt-8">
        <div>
          <h2 className="cta-banner__title">Know what you want?</h2>
          <p className="cta-banner__text">
            Skip browsing and go straight to a recipe — or let us surprise you.
          </p>
        </div>
        <div className="cta-banner__actions">
          <Link className="btn btn--secondary btn--lg" to="/recipes">
            All recipes
          </Link>
          <RandomRecipeButton className="btn btn--accent btn--lg" />
        </div>
      </div>
    </>
  );
}

export default Categories;