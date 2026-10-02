import { Link } from 'react-router-dom';
import { categoryIcons, heroImage } from '../assets/media';
import { Picture } from './Picture';

/**
 * The four category tiles featured in the hero.
 *
 * Each tile navigates to a search for that term rather than a category filter,
 * because these were chosen as "what people are looking for" entry points —
 * and a search matches more than the strict category (a search for "cake"
 * finds desserts in any category).
 */
const featuredTiles = [
  { label: 'Pasta', term: 'pasta', icon: categoryIcons.Pasta },
  { label: 'Chicken', term: 'chicken', icon: categoryIcons.Chicken },
  { label: 'Cake', term: 'cake', icon: categoryIcons.Cake },
  { label: 'Beef', term: 'beef', icon: categoryIcons.Beef },
];

/**
 * Home page hero: photograph, dark scrim, headline and navigation.
 *
 * The image is the Largest Contentful Paint element, so it is eager with
 * `fetchPriority="high"` and its intrinsic dimensions are declared to avoid
 * layout shift. The scrim gradient keeps the text legible over any part of the
 * photograph.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media">
        <Picture
          className="hero__image"
          src={heroImage.src}
          srcSet={heroImage.srcSet}
          sizes="100vw"
          alt=""
          // Decorative: the hero copy already conveys the subject.
          width="1600"
          height="900"
          eager
        />
      </div>

      <div className="hero__scrim" aria-hidden="true" />

      <div className="hero__content">
        <h1 className="hero__title" id="hero-title">
          Discover Amazing Recipes
        </h1>

        <p className="hero__text">
          Search hundreds of recipes from around the world and find your next
          favorite meal
        </p>

        <div className="hero__actions">
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

        <nav className="hero__tiles" aria-label="Featured categories">
          {featuredTiles.map((tile) => (
            <Link
              key={tile.label}
              className="hero__tile"
              to={`/search?query=${encodeURIComponent(tile.term)}`}
            >
              <Picture
                className="hero__tile-icon"
                src={tile.icon.src}
                srcSet={tile.icon.srcSet}
                sizes="52px"
                alt=""
                width="52"
                height="52"
              />
              <span>{tile.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

export default Hero;