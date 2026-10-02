import { useFavorites } from '../hooks/useFavorites';
import { HeartIcon } from './Icons';

/**
 * Favourite toggle.
 *
 * The pressed state comes from the context, not local state, so every card
 * showing the same recipe stays in sync. The accessible name states the
 * action ("Add X to favourites") rather than the state, which is what a
 * screen-reader user needs to hear.
 *
 * @param {{recipeId: string, recipeName: string, className?: string}} props
 */
export function FavouriteButton({ recipeId, recipeName, className = 'btn btn--icon card__favourite' }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!recipeId) return null;

  const active = isFavorite(recipeId);

  return (
    <button
      type="button"
      className={className}
      // `pressed` conveys the on/off state to assistive technology.
      aria-pressed={active}
      aria-label={
        active ? `Remove ${recipeName} from favourites` : `Add ${recipeName} to favourites`
      }
      title={active ? 'Remove from favourites' : 'Add to favourites'}
      onClick={() => toggleFavorite(recipeId)}
    >
      <HeartIcon
        filled={active}
        width="20"
        height="20"
        style={active ? { color: 'var(--color-danger)' } : undefined}
      />
    </button>
  );
}

export default FavouriteButton;