import { CategoryCard } from './CategoryCard';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { RecipeCard } from './RecipeCard';
import { SkeletonGrid } from './Loading';

/**
 * Renders a list of recipes (or categories) together with its loading, error
 * and empty states.
 *
 * Centralising this means every list in the app behaves identically and no
 * page can accidentally render a blank screen while data is in flight.
 *
 * @param {object} props
 * @param {object[]} props.items
 * @param {'recipe'|'category'} [props.variant]
 * @param {boolean} props.isLoading
 * @param {Error} [props.error]
 * @param {() => void} [props.onRetry]
 * @param {number} [props.skeletonCount]
 * @param {string} [props.emptyTitle]
 * @param {string} [props.emptyMessage]
 * @param {import('react').ReactNode} [props.emptyAction]
 */
export function RecipeGrid({
  items,
  variant = 'recipe',
  isLoading,
  error,
  onRetry,
  skeletonCount = 8,
  emptyTitle,
  emptyMessage,
  emptyAction,
}) {
  // A refresh over existing results keeps the current cards on screen instead
  // of flashing skeletons, which prevents the layout jumping under the user.
  if (isLoading && items.length === 0) {
    return (
      <SkeletonGrid
        count={skeletonCount}
        className={variant === 'category' ? 'grid--categories' : 'grid--recipes'}
        label={variant === 'category' ? 'Loading categories' : 'Loading recipes'}
      />
    );
  }

  if (error && items.length === 0) {
    return <ErrorMessage error={error} onRetry={onRetry} />;
  }

  if (!isLoading && items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <>
      {error ? (
        // Non-blocking: stale results stay usable while the failure is shown.
        <div className="mb-4">
          <ErrorMessage
            error={error}
            onRetry={onRetry}
            title="We could not refresh these results."
            message="Showing the last results that loaded. Try again to update them."
          />
        </div>
      ) : null}

      <div
        className={variant === 'category' ? 'grid grid--categories' : 'grid grid--recipes'}
        // Announce the count once results replace the skeletons.
        aria-busy={isLoading}
      >
        {items.map((item) =>
          variant === 'category' ? (
            <CategoryCard key={item.name || item.id} category={item} />
          ) : (
            <RecipeCard key={item.id} recipe={item} />
          ),
        )}
      </div>
    </>
  );
}

export default RecipeGrid;