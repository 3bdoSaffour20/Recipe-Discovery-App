import { Link } from 'react-router-dom';
import {
  BookOpenIcon,
  GlobeIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  UtensilsIcon,
} from '../components/Icons';

/** What the app lets visitors do, mirroring the feature set. */
const features = [
  {
    icon: SearchIcon,
    title: 'Search recipes',
    text: 'Find a dish by name in seconds. Search matches recipe names across the whole collection, not just the first page.',
  },
  {
    icon: GridIcon,
    title: 'Browse categories',
    text: 'Explore every category TheMealDB publishes — from Beef and Chicken to Vegan, Side and Miscellaneous.',
  },
  {
    icon: ListIcon,
    title: 'View ingredients',
    text: 'Every recipe lists its full ingredient list with the exact measurement for each one.',
  },
  {
    icon: BookOpenIcon,
    title: 'Read instructions',
    text: 'Cooking methods are split into clear, numbered steps that are easy to follow while you cook.',
  },
  {
    icon: GlobeIcon,
    title: 'Discover cuisines',
    text: 'Each recipe is tagged with the region it comes from, so you can travel without leaving the kitchen.',
  },
  {
    icon: UtensilsIcon,
    title: 'Explore new meals',
    text: 'Save the recipes you love to your favourites list and they stay on this device between visits.',
  },
];

const stats = [
  { value: '300+', label: 'Recipes' },
  { value: '14', label: 'Categories' },
  { value: '30+', label: 'Cuisines' },
  { value: '100%', label: 'Free to use' },
];

/** About page. */
export function About() {
  return (
    <>
      <section className="about-hero">
        <div className="about-hero__content">
          <h1 className="about-hero__title">About Recipe Discovery</h1>
          <p className="about-hero__text">
            Recipe Discovery helps users discover delicious recipes from around
            the world — whether you know exactly what you want to cook, or you
            would rather be surprised.
          </p>
        </div>
      </section>

      <div className="container--narrow">
        <section className="about-section">
          <h2 className="about-section__title">What you can do</h2>
          <div className="prose">
            <p>
              Every recipe here comes from <strong>TheMealDB</strong>, a free
              open recipe database. That means the collection is large, varied
              and genuinely international rather than a handful of dishes
              repeated.
            </p>
            <p>
              You can <strong>search recipes</strong> by name,{' '}
              <strong>browse categories</strong> to browse by type of dish,{' '}
              <strong>view ingredients</strong> with exact measurements,{' '}
              <strong>read cooking instructions</strong> broken into steps,{' '}
              <strong>discover different cuisines</strong>, and{' '}
              <strong>explore new meals</strong> for ideas whenever you have not
              decided what to cook yet.
            </p>
          </div>
        </section>

        <section className="about-section">
          <div className="grid grid--categories">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className="feature-card" key={feature.title}>
                  <span className="feature-card__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3 className="feature-card__title">{feature.title}</h3>
                  <p className="feature-card__text">{feature.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-section__title">Why it is built this way</h2>
          <div className="prose">
            <p>
              The whole app is designed mobile-first. That is not an
              afterthought — most people looking up a recipe are standing in a
              kitchen holding a phone, so every control is sized for a thumb,
              the layout never scrolls sideways, and the type stays readable
              without zooming.
            </p>
            <p>
              It is also fast and forgiving. Recipe data is cached so moving
              between pages does not re-download the same records, failed
              requests are retried automatically, and any loading or error state
              tells you what happened and offers a way to fix it.
            </p>
          </div>

          <div className="stat-row">
            {stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <div className="stat__value">{stat.value}</div>
                <div className="stat__label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="panel">
            <h2 className="panel__title">
              <UtensilsIcon className="panel__title-icon" />
              Credits
            </h2>
            <div className="prose">
              <p>
                Recipe data and photography are provided by{' '}
                <a
                  className="text-accent"
                  href="https://www.themealdb.com"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  TheMealDB
                </a>
                . This project is a front-end interface built with React and
                Vite; it is not affiliated with TheMealDB.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="cta-banner mt-8">
        <div>
          <h2 className="cta-banner__title">Ready to cook?</h2>
          <p className="cta-banner__text">
            Start with the full collection, or pick a category and dive in.
          </p>
        </div>
        <div className="cta-banner__actions">
          <Link className="btn btn--secondary btn--lg" to="/categories">
            Browse Categories
          </Link>
          <Link className="btn btn--primary btn--lg" to="/recipes">
            Explore Recipes
          </Link>
        </div>
      </div>
    </>
  );
}

export default About;