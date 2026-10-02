import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ActionRow } from '../components/ActionRow';
import { CategoryCard } from '../components/CategoryCard';
import { Hero } from '../components/Hero';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { RecipeCard } from '../components/RecipeCard';
import { SkeletonGrid } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useCategories, useFeaturedRecipes } from '../hooks/useRecipes';

/**
 * Home page: hero, popular recipes, featured categories, calls to action.
 *
 * The two data sections load independently, so a failure in one does not hide
 * the other.
 */
export function Home() {
  const { recipes, error, isLoading, refetch } = useFeaturedRecipes(8);
  const { categories, error: categoriesError, isLoading: categoriesLoading, refetch: refetchCategories } =
    useCategories();

  // Only the categories with bundled artwork get a tile on the home page; the
  // full set lives on /categories.
  const featuredCategories = useMemo(
    () =>
      categories.filter((category) =>
        ['Beef', 'Chicken', 'Dessert', 'Pasta'].includes(category.name),
      ),
    [categories],
  );

  return (
    <>
      <Hero />

      <ActionRow />

      <section className="section" aria-labelledby="popular-heading">
        <div className="section__header">
          <h2 className="section__title" id="popular-heading">
            Popular Recipes
          </h2>
          <p className="section__subtitle">
            A hand-picked selection of dishes people are cooking right now.
          </p>
        </div>

        {error && recipes.length === 0 ? (
          <ErrorMessage error={error} onRetry={refetch} />
        ) : isLoading && recipes.length === 0 ? (
          <SkeletonGrid count={8} label="Loading popular recipes" />
        ) : (
          <div className="grid grid--recipes">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        <div className="cluster cluster--center gap-4 mt-8">
          <Link className="btn btn--secondary btn--lg" to="/recipes">
            See all recipes
          </Link>
          <RandomRecipeButton />
        </div>
      </section>

      <section className="section" aria-labelledby="categories-heading">
        <div className="section__header">
          <h2 className="section__title" id="categories-heading">
            Featured Categories
          </h2>
          <p className="section__subtitle">
            Start with a favourite, from hearty beef to fresh pasta.
          </p>
        </div>

        {categoriesError ? (
          <ErrorMessage error={categoriesError} onRetry={refetchCategories} />
        ) : categoriesLoading && categories.length === 0 ? (
          <SkeletonGrid
            count={4}
            className="grid--categories"
            label="Loading categories"
          />
        ) : (
          <div className="grid grid--categories">
            {featuredCategories.map((category) => (
              <CategoryCard key={category.name} category={category} />
            ))}
          </div>
        )}

        <div className="cluster cluster--center mt-8">
          <Link className="btn btn--secondary btn--lg" to="/categories">
            Browse all categories
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="cta-banner">
          <div>
            <h2 className="cta-banner__title">Can't decide what to cook?</h2>
            <p className="cta-banner__text">
              Let us pick something for you — every click loads a completely
              different recipe from around the world.
            </p>
          </div>
          <div className="cta-banner__actions">
            <RandomRecipeButton className="btn btn--accent btn--lg" />
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;