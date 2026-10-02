/**
 * Loading states.
 *
 * `Loading` is a centred spinner for whole-page waits; `SkeletonGrid` reserves
 * the exact layout of the results that are coming, which stops the page from
 * jumping when the data lands.
 */

/** Placeholder card matching RecipeCard's dimensions. */
function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-card__media" />
      <div className="skeleton-card__body">
        <div className="skeleton skeleton-card__line skeleton-card__line--title" />
        <div className="skeleton skeleton-card__line" />
        <div className="skeleton skeleton-card__line skeleton-card__line--short" />
      </div>
    </div>
  );
}

/**
 * A grid of shimmering placeholders.
 * @param {{count?: number, className?: string, label?: string}} props
 */
export function SkeletonGrid({ count = 8, className = 'grid--recipes', label = 'Loading recipes' }) {
  return (
    <div
      className={`grid ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}...</span>
      {Array.from({ length: count }, (_, index) => (
        // Placeholders carry no data, so the index is a stable identity.
        // eslint-disable-next-line react/no-array-index-key
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/**
 * A centred animated spinner.
 * @param {{label?: string, small?: boolean}} props
 */
export function Loading({ label = 'Loading recipes', small = false }) {
  return (
    <div
      className="state"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={small ? { padding: 'var(--space-6)' } : undefined}
    >
      <span className={small ? 'spinner spinner--sm' : 'spinner'} aria-hidden="true" />
      <span className="sr-only">{label}...</span>
    </div>
  );
}



export default Loading;