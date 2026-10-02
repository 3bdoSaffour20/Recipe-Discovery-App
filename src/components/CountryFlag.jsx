import { getFlagClassName } from '../utils/countryFlags';

/**
 * Neutral glyph for a recipe whose cuisine TheMealDB does not name.
 *
 * A plate and cutlery rather than a flag, because there is no country to show —
 * the app does not invent one, and does not infer one from the recipe name.
 */
const PLACEHOLDER = '\u{1F37D}';

/**
 * The country flag for a recipe's `strArea`, or a neutral placeholder.
 *
 * The artwork is an SVG from the `flag-icons` package rather than a Unicode
 * emoji: a regional-indicator pair such as the Spanish flag is only a flag if
 * the OS supplies the glyph, and Windows browsers without an emoji flag font
 * render the two letters instead ("ES Spanish"). SVG from the bundle looks the
 * same on every desktop and mobile browser.
 *
 * Decorative by design — `aria-hidden` in both branches — so a screen reader
 * hears "Spanish" from the text beside it, not "flag Spanish". The country name
 * is the content; the flag only helps a sighted reader recognise it.
 *
 * @param {object} props
 * @param {string} [props.area] The `strArea` value to resolve.
 * @param {string} [props.className] Extra class names, for size variants.
 */
export function CountryFlag({ area, className = '' }) {
  const extra = className ? ` ${className}` : '';
  const flagClassName = getFlagClassName(area);

  if (flagClassName) {
    return <span className={`${flagClassName} country-flag${extra}`} aria-hidden="true" />;
  }

  return (
    <span className={`country-placeholder${extra}`} aria-hidden="true">
      {PLACEHOLDER}
    </span>
  );
}

export default CountryFlag;
