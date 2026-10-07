import { useRecipeRating } from '../context/RatingsContext';
import { StarRating } from './StarRating';

/**
 * Average rating, stars and rating count for one recipe.
 *
 * Renders nothing until the statistics have loaded, so a card never flashes
 * "no ratings" for a recipe that is about to show 4.8. A recipe with zero
 * ratings shows empty stars and the words "No ratings yet" — never `0.0`,
 * which would read as an actual score.
 *
 * @param {object} props
 * @param {string} props.recipeId TheMealDB `idMeal`.
 * @param {{average: number|null, count: number}} [props.rating] Pre-loaded
 *   statistics; falls back to the shared ratings cache.
 * @param {boolean} [props.compact] Card-sized text: `4.8 (32)` instead of
 *   `4.8 / 5` and `32 ratings`.
 * @param {string} [props.className] Extra classes for layout contexts.
 */
export function RecipeRatingSummary({ recipeId, rating, compact = false, className = '' }) {
  const { rating: cached } = useRecipeRating(recipeId);
  const stats = rating ?? cached;

  if (!stats) return null;

  const classes = `rating-summary ${className}`.trim();

  if (!stats.count) {
    return (
      <div className={`${classes} rating-summary--empty`}>
        <StarRating value={0} />
        <span className="rating-summary__count">No ratings yet</span>
      </div>
    );
  }

  const average = Number(stats.average) || 0;

  return (
    <div className={classes}>
      <StarRating value={average} />
      <span className="rating-summary__score">
        {average.toFixed(1)}
        {compact ? null : <span className="rating-summary__scale"> / 5</span>}
      </span>
      <span className="rating-summary__count">
        {compact
          ? `(${stats.count})`
          : `${stats.count} rating${stats.count === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}

export default RecipeRatingSummary;
