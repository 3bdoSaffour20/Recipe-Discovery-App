import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ShuffleIcon } from './Icons';

/**
 * Navigates to a random recipe.
 *
 * The click resolves a `/recipe/random` route rather than calling the API
 * here: keeping the fetch inside the detail page means a refresh of that URL
 * yields another random recipe, and the loading and error states come from the
 * same component that handles every other recipe.
 *
 * @param {{className?: string, label?: string}} props
 */
export function RandomRecipeButton({ className = 'btn btn--accent btn--lg', label = 'Random Recipe' }) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  function handleClick() {
    if (isNavigating) return;
    setIsNavigating(true);
    // A short delay gives the user feedback that the tap registered before
    // the destination starts loading.
    setTimeout(() => navigate('/recipe/random'), 150);
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={isNavigating}>
      <ShuffleIcon className="btn__icon" />
      {isNavigating ? 'Finding a recipe...' : label}
    </button>
  );
}

export default RandomRecipeButton;