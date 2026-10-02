import { Link } from 'react-router-dom';

/**
 * Primary calls to action.
 *
 * Stacks into full-width buttons below 480px so each one is an easy tap
 * target, then becomes a centred row once there is room for them side by side.
 */
export function ActionRow() {
  return (
    <div className="action-row">
      <Link className="btn btn--primary btn--lg" to="/recipes">
        Explore Recipes
      </Link>
      <Link className="btn btn--secondary btn--lg" to="/categories">
        Browse Categories
      </Link>
      <Link className="btn btn--ghost btn--lg" to="/about">
        About Us
      </Link>
    </div>
  );
}

export default ActionRow;