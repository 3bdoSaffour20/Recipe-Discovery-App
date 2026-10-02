import { Link } from 'react-router-dom';
import { RandomRecipeButton } from '../components/RandomRecipeButton';

/** 404 page for any unmatched route. */
export function NotFound() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="page-header__title">We could not find that page</h1>
      <p className="page-header__description">
        The link may be broken, or the recipe may have been removed from
        TheMealDB.
      </p>

      <div className="cluster cluster--center gap-3 mt-4">
        <Link className="btn btn--primary" to="/">
          Back to home
        </Link>
        <Link className="btn btn--secondary" to="/recipes">
          Explore recipes
        </Link>
        <RandomRecipeButton className="btn btn--accent" />
      </div>
    </div>
  );
}

export default NotFound;