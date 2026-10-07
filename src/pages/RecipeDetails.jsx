import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CountryFlag } from '../components/CountryFlag';
import { ErrorMessage } from '../components/ErrorMessage';
import { FavouriteButton } from '../components/FavouriteButton';
import { Loading } from '../components/Loading';
import { Picture } from '../components/Picture';
import { RandomRecipeButton } from '../components/RandomRecipeButton';
import { RecipeReviews } from '../components/RecipeReviews';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  ListIcon,
  TagIcon,
  UtensilsIcon,
  YoutubeIcon,
} from '../components/Icons';
import { useRecipeDetails, useRandomMeal } from '../hooks/useRecipes';
import {
  buildIngredients,
  buildSourceUrl,
  hasStepMarkers,
  imageUrl,
  splitInstructions,
  toYoutubeEmbedUrl,
} from '../utils/helpers';
import { UNKNOWN_CUISINE_LABEL } from '../utils/countryFlags';

const NO_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">' +
      '<rect width="600" height="450" fill="#1e293b"/>' +
      '<text x="300" y="230" font-family="sans-serif" font-size="22" fill="#7c8ba3" ' +
      'text-anchor="middle">No image available</text></svg>',
  );

/** Ingredients paired with their measures, built dynamically from the record. */
function IngredientList({ ingredients }) {
  return (
    <ul className="ingredient-list">
      {ingredients.map((ingredient) => (
        <li className="ingredient" key={ingredient.index}>
          <span className="ingredient__index" aria-hidden="true">
            {ingredient.index}
          </span>
          {/* The measure is announced after the name, which is the natural
              reading order for a recipe. */}
          <span className="ingredient__name">
            {ingredient.name}
            <span className="sr-only">
              {ingredient.measure ? `, ${ingredient.measure}` : ', amount not specified'}
            </span>
          </span>
          <span className="ingredient__measure" aria-hidden="true">
            {ingredient.measure || '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Instructions split into readable steps. */
function Instructions({ instructions }) {
  const steps = splitInstructions(instructions);
  // Only number an explicit numbered/STEP list. Prose rendered as several
  // paragraphs must not acquire step numbers it never had.
  const numbered = steps.length > 1 && hasStepMarkers(instructions);

  return (
    <div className={numbered ? 'instructions instructions--numbered' : 'instructions'}>
      {steps.map((step, index) => (
        <p
          className={numbered ? 'instruction-step' : undefined}
          key={`${index}-${step.slice(0, 24)}`}
        >
          {step}
        </p>
      ))}
    </div>
  );
}

/**
 * A single recipe.
 *
 * `/recipe/random` resolves a fresh random meal and then rewrites the URL to
 * that meal's real id, so the page is shareable and a refresh shows the same
 * dish rather than another one.
 */
export function RecipeDetails() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const isRandomRoute = routeId === 'random';

  const { recipe: randomRecipe, isLoading: isRandomLoading, error: randomError, reload } =
    useRandomMeal();

  const resolvedId = isRandomRoute ? randomRecipe?.id : routeId;

  const { recipe, error, isLoading, refetch } = useRecipeDetails(resolvedId);

  const [favouriteId, setFavouriteId] = useState(recipe?.id);
  useEffect(() => setFavouriteId(recipe?.id), [recipe?.id]);

  // Swap /recipe/random for the concrete id once the meal is known.
  useEffect(() => {
    if (isRandomRoute && randomRecipe?.id) {
      navigate(`/recipe/${randomRecipe.id}`, { replace: true });
    }
  }, [isRandomRoute, randomRecipe, navigate]);

  const loading = isRandomRoute ? isRandomLoading || (isLoading && !recipe) : isLoading;
  const failure = isRandomRoute ? randomError : error;
  const retry = isRandomRoute ? reload : refetch;

  if (loading) {
    return (
      <div className="container--narrow">
        <Loading label="Loading recipe" />
      </div>
    );
  }

  if (failure || !recipe) {
    return (
      <div className="container--narrow">
        <ErrorMessage
          error={failure}
          onRetry={retry}
          title="We could not load this recipe."
          message={
            failure
              ? undefined
              : 'This recipe does not exist, or it may have been removed from TheMealDB.'
          }
        />
        <div className="cluster cluster--center mt-6">
          <Link className="btn btn--secondary" to="/recipes">
            Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  const ingredients = buildIngredients(recipe);
  const steps = splitInstructions(recipe.instructions);
  const embedUrl = toYoutubeEmbedUrl(recipe.youtube);
  const sourceUrl = recipe.source || buildSourceUrl(recipe.id, recipe.name);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Recipes', to: '/recipes' },
          ...(recipe.category ? [{ label: recipe.category, to: `/recipes?category=${encodeURIComponent(recipe.category)}` }] : []),
          { label: recipe.name },
        ]}
      />

      <article>
        <div className="detail-layout">
          <div className="detail-hero">
            <div className="detail-hero__media">
              <Picture
                className="detail-hero__image"
                src={imageUrl(recipe.thumbnail, NO_IMAGE)}
                alt={`${recipe.name} — dish photograph`}
                // Above the fold on first paint, so it loads eagerly.
                sizes="(min-width: 1024px) 352px, 100vw"
                eager
                width="600"
                height="450"
              />
            </div>

            <div className="detail-hero__actions">
              <FavouriteButton
                recipeId={favouriteId}
                recipeName={recipe.name}
                className="btn btn--secondary"
              />
              <Link className="btn btn--primary" to="/recipes">
                <BookOpenIcon className="btn__icon" />
                All recipes
              </Link>
            </div>
          </div>

          <div>
            <div className="detail__tags">
              {recipe.category ? (
                <Link
                  className="tag tag--accent"
                  to={`/recipes?category=${encodeURIComponent(recipe.category)}`}
                >
                  <TagIcon width="14" height="14" />
                  {recipe.category}
                </Link>
              ) : null}

              {/*
                The same area handling as the card: a recipe with no `strArea`
                states that, rather than leaving the tag row short of the
                cuisine the reader came for.
              */}
              <span className="tag">
                <CountryFlag area={recipe.area} />
                {recipe.area || UNKNOWN_CUISINE_LABEL}
              </span>

              {recipe.tags.map((tag) => (
                <span className="tag" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="detail__title">{recipe.name}</h1>

            <div className="detail__meta">
              {recipe.category ? (
                <span className="detail__meta-item">
                  <TagIcon className="detail__meta-icon" />
                  Category: {recipe.category}
                </span>
              ) : null}

              <span className="detail__meta-item">
                <CountryFlag area={recipe.area} />
                Cuisine: {recipe.area || UNKNOWN_CUISINE_LABEL}
              </span>

              <span className="detail__meta-item">
                <ListIcon className="detail__meta-icon" />
                {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'}
              </span>
            </div>

            {ingredients.length > 0 ? (
              <section className="panel" aria-labelledby="ingredients-heading">
                <h2 className="panel__title" id="ingredients-heading">
                  <UtensilsIcon className="panel__title-icon" />
                  Ingredients
                </h2>
                <IngredientList ingredients={ingredients} />
              </section>
            ) : null}

            {steps.length > 0 ? (
              <section className="panel" aria-labelledby="instructions-heading">
                <h2 className="panel__title" id="instructions-heading">
                  <BookOpenIcon className="panel__title-icon" />
                  Instructions
                </h2>
                <Instructions instructions={recipe.instructions} />
              </section>
            ) : null}

            {embedUrl ? (
              <section className="panel" aria-labelledby="video-heading">
                <h2 className="panel__title" id="video-heading">
                  <YoutubeIcon className="panel__title-icon" />
                  Watch it being made
                </h2>
                <div className="video-embed">
                  <iframe
                    src={embedUrl}
                    title={`Video for ${recipe.name}`}
                    loading="lazy"
                    // `youtube-nocookie` needs these permissions for the
                    // embedded player to run.
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </section>
            ) : null}

            {sourceUrl ? (
              <section className="panel" aria-labelledby="source-heading">
                <h2 className="panel__title" id="source-heading">
                  <ExternalLinkIcon className="panel__title-icon" />
                  Source
                </h2>
                <div className="detail__links">
                  <a
                    className="btn btn--secondary"
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    View original recipe
                    <ExternalLinkIcon className="btn__icon" />
                  </a>
                </div>
              </section>
            ) : null}
          </div>
        </div>

        {/*
          Ratings and comments live below the instructions, full width: the
          detail column is already dense, and a section wide enough to hold a
          comment thread reads better on its own.
        */}
        <RecipeReviews recipeId={recipe.id} />
      </article>

      <div className="cta-banner mt-8">
        <div>
          <h2 className="cta-banner__title">Hungry for something else?</h2>
          <p className="cta-banner__text">
            Try another recipe from around the world, or keep browsing the full
            collection.
          </p>
        </div>
        <div className="cta-banner__actions">
          <Link className="btn btn--secondary btn--lg" to="/recipes">
            All recipes
          </Link>
          <RandomRecipeButton />
        </div>
      </div>
    </>
  );
}

export default RecipeDetails;