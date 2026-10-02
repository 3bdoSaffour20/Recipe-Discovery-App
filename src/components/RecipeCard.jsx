import { Link } from 'react-router-dom';
import { TagIcon } from './Icons';
import { CountryFlag } from './CountryFlag';
import { FavouriteButton } from './FavouriteButton';
import { Picture } from './Picture';
import { imageUrl } from '../utils/helpers';
import { UNKNOWN_CUISINE_LABEL } from '../utils/countryFlags';

/** Placeholder shown when a recipe has no thumbnail. */
const NO_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
      '<rect width="400" height="300" fill="#1e293b"/>' +
      '<text x="200" y="155" font-family="sans-serif" font-size="18" fill="#7c8ba3" ' +
      'text-anchor="middle">No image</text></svg>',
  );

/**
 * A single recipe summary card.
 *
 * The whole card is one link (`card__link` stretches a pseudo-element over the
 * card), so the entire surface is clickable without nesting the favourite
 * button inside an anchor — nested interactive elements are invalid HTML and
 * break keyboard navigation.
 *
 * @param {{recipe: object}} props
 */
export function RecipeCard({ recipe }) {
  const { id, name, thumbnail, category, area } = recipe;

  return (
    <article className="card card--interactive">
      <div className="card__media">
        <Link to={`/recipe/${id}`} tabIndex={-1} aria-hidden="true">
          <Picture
            className="card__image"
            src={imageUrl(thumbnail, NO_IMAGE)}
            alt=""
            loading="lazy"
            // 4:3 matches .card__media, so the browser reserves the right
            // space and the grid does not reflow as images arrive.
            width="400"
            height="300"
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 92vw"
          />
        </Link>

        {category ? <span className="card__badge">{category}</span> : null}

        <FavouriteButton recipeId={id} recipeName={name} />
      </div>

      <div className="card__body">
        <h3 className="card__title">
          <Link className="card__link" to={`/recipe/${id}`}>
            {name}
          </Link>
        </h3>

        <div className="card__meta">
          {category ? (
            <span className="card__meta-item">
              <TagIcon className="card__meta-icon" />
              <span>{category}</span>
            </span>
          ) : null}

          {/*
            Always rendered. TheMealDB omits `strArea` on some records, and a
            cuisine line that is silently blank is worse than one that admits
            the gap — so an unknown area says so rather than guessing a country.
          */}
          <span className="card__meta-item">
            {/* Decorative: the country name beside it already carries the
                meaning, so the flag is not announced twice. */}
            <CountryFlag area={area} />
            <span className="recipe-area-name">{area || UNKNOWN_CUISINE_LABEL}</span>
          </span>
        </div>
      </div>

      <div className="card__footer">
        <Link className="btn btn--secondary" to={`/recipe/${id}`}>
          View Recipe
        </Link>
      </div>
    </article>
  );
}

export default RecipeCard;