import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './Icons';
import { Picture } from './Picture';
import { categoryPhotos } from '../assets/media';
import { truncate } from '../utils/helpers';

/**
 * A category tile.
 *
 * TheMealDB thumbnail for a category is a 3:2 image, but a few records serve
 * a tiny or transparent asset. Those fall back to the matching bundled photo
 * so every tile has real imagery, and beef/chicken/dessert/pasta additionally
 * use the optimised local file instead of the remote one.
 */
function resolveImage(category) {
  const local = categoryPhotos[category.name];
  if (local) return local;

  const remote = category.image;
  if (!remote) return null;

  return { src: remote.startsWith('//') ? `https:${remote}` : remote };
}

/**
 * @param {{category: {name: string, description: string, image: string}}} props
 */
export function CategoryCard({ category }) {
  const image = resolveImage(category);
  const description =
    category.description || `Browse every ${category.name.toLowerCase()} recipe.`;

  return (
    <article className="card card--interactive">
      <div className="card__media">
        <Link to={`/recipes?category=${encodeURIComponent(category.name)}`} tabIndex={-1} aria-hidden="true">
          {image ? (
            <Picture
              className="category-card__image"
              src={image.src}
              srcSet={image.srcSet}
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 92vw"
              alt=""
              width="300"
              height="200"
            />
          ) : (
            <div className="category-card__image" />
          )}
        </Link>
      </div>

      <div className="category-card__body">
        <h3 className="category-card__title">
          <Link className="card__link" to={`/recipes?category=${encodeURIComponent(category.name)}`}>
            {category.name}
          </Link>
        </h3>

        <p className="category-card__description">{truncate(description, 130)}</p>

        <span className="category-card__count">
          Browse recipes
          <ArrowRightIcon width="16" height="16" />
        </span>
      </div>
    </article>
  );
}

export default CategoryCard;