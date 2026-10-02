import { Link } from 'react-router-dom';
import { ChevronSeparator } from './Icons';

/**
 * Breadcrumb trail.
 *
 * `aria-current="page"` marks the final crumb, and the list is hidden from the
 * accessibility tree as a whole because the trail duplicates the page title.
 *
 * @param {{items: {label: string, to?: string}[]}} props
 */
export function Breadcrumbs({ items }) {
  if (!items?.length) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumbs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="cluster gap-2" key={`${item.label}-${index}`}>
              {index > 0 ? (
                <span className="breadcrumbs__separator" aria-hidden="true">
                  <ChevronSeparator />
                </span>
              ) : null}

              {item.to && !isLast ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;