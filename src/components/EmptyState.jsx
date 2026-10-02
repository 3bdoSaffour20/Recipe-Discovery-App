import { SearchOffIcon } from './Icons';

/**
 * Empty state for a query that legitimately returned nothing.
 * Distinct from `ErrorMessage`: nothing went wrong, there was simply no match.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {import('react').ReactNode} [props.action]
 */
export function EmptyState({
  title = 'No recipes found.',
  message = 'Try searching for another recipe.',
  action,
}) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        <SearchOffIcon />
      </span>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">{message}</p>
      {action}
    </div>
  );
}

export default EmptyState;