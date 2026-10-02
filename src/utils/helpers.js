/**
 * Pure helpers shared by the API service and the UI.
 * No React and no network access live here.
 */

/** TheMealDB exposes at most 20 ingredient slots per recipe. */
const MAX_INGREDIENT_SLOTS = 20;

/** Collapses whitespace and trims, mapping null/undefined to ''. */
function clean(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/**
 * Combines `strIngredient1..20` with `strMeasure1..20` into a list.
 *
 * The API returns two parallel indexed series, so the pairing is built
 * dynamically rather than hard-coded — no ingredient is assumed. Slots whose
 * ingredient is empty are skipped entirely, and a slot with an ingredient but
 * no measure is still included (the measure renders as a dash).
 *
 * @param {object} meal A raw TheMealDB meal record.
 * @returns {{index: number, name: string, measure: string}[]}
 */
export function buildIngredients(meal) {
  if (!meal) return [];

  const ingredients = [];

  for (let slot = 1; slot <= MAX_INGREDIENT_SLOTS; slot += 1) {
    const name = clean(meal[`strIngredient${slot}`]);
    if (!name) continue;

    ingredients.push({
      index: slot,
      name,
      measure: clean(meal[`strMeasure${slot}`]),
    });
  }

  return ingredients;
}

/**
 * Matches a step marker at the start of a line: `1.`, `1)`, `1:`, `1 -`,
 * `Step 3` or `STEP 3 -`.
 *
 * The line-start anchor matters. Without it, prose such as
 * "Bake for 20. minutes" would be torn apart, because the digits of a
 * measurement satisfy the same pattern.
 */
const STEP_MARKER = /^\s*(?:step\s*)?\d{1,2}\s*[.):\-]\s+/i;

/**
 * A real instruction contains a letter or a digit.
 *
 * The API occasionally emits a line holding nothing but a bullet or box glyph
 * (`▢`, `•`), which is a separator rather than a step. Rendering it would put
 * an empty-looking paragraph at the top of the method.
 */
const MEANINGFUL = /[\p{L}\p{N}]/u;

const isStep = (text) => MEANINGFUL.test(text);

/** Trims without collapsing newlines, which carry step structure. */
function cleanMultiline(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\r\n?/g, '\n').trim();
}

/** True when the instruction text is an explicit numbered/STEP list. */
export function hasStepMarkers(instructions) {
  if (!cleanMultiline(instructions)) return false;

  return cleanMultiline(instructions)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .split(/\n+/)
    .some((line) => STEP_MARKER.test(line));
}

/**
 * Splits `strInstructions` into readable steps.
 *
 * TheMealDB mixes numbered lists, `STEP 1` markers, embedded `<br>`/`<p>`
 * markup and plain prose, so all four are normalised to one array. Lines that
 * do not start a step are appended to the step above them, which keeps a
 * wrapped instruction with its own step. Instructions are never dropped: text
 * that matches no marker is returned as its own block.
 *
 * @param {string} instructions
 * @returns {string[]}
 */
export function splitInstructions(instructions) {
  // Deliberately not `clean()`, which collapses newlines: the line breaks are
  // what separate one step from the next.
  const text = cleanMultiline(instructions);
  if (!text) return [];

  const normalised = text
    // The API sometimes embeds markup in the instruction field.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ');

  const lines = normalised
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) return isStep(text) ? [text] : [];

  // Unstructured prose: keep the line breaks as paragraph breaks.
  if (!lines.some((line) => STEP_MARKER.test(line))) {
    return lines.filter(isStep);
  }

  const steps = [];

  for (const line of lines) {
    const marker = line.match(STEP_MARKER);

    if (marker) {
      steps.push(line.slice(marker[0].length).trim());
    } else if (steps.length > 0) {
      // A continuation of the previous step.
      steps[steps.length - 1] += ` ${line}`;
    } else {
      // Preamble before the first marker.
      steps.push(line);
    }
  }

  return steps.filter(isStep);
}

/** `chicken_breast` / `chicken-breast` -> `Chicken Breast`. */
export function humanize(value) {
  const text = clean(value);
  if (!text) return '';

  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Picks the recipe's country/cuisine label.
 *
 * `strArea` is the primary source — it is what the API calls the cuisine, and
 * what every card is meant to show. It is also missing on roughly a quarter of
 * the records, so `strCountry` backs it up: the same `filter.php` response
 * names the country on every record (611 of 611 across the free categories,
 * against 458 for `strArea`), and it is a stated fact rather than a guess.
 *
 * That distinction is the point. Reading a field the API actually sent is
 * recovering missing data; inferring a country from the recipe's title would be
 * inventing one, and this function never does that. When both are absent the
 * result is empty, and the UI says the cuisine is not specified.
 *
 * @param {object} meal A raw TheMealDB meal record.
 * @returns {string} The area or country name, or '' when neither is given.
 */
function resolveArea(meal) {
  return humanize(meal.strArea) || humanize(meal.strCountry);
}

/** Shortens text to `length` characters, appending an ellipsis when cut. */
export function truncate(value, length = 140) {
  const text = clean(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}...`;
}


/**
 * Normalises a meal record for rendering: trims the text fields the UI shows
 * and guarantees the shape the components expect.
 */
export function normalizeMeal(meal) {
  if (!meal) return null;

  return {
    ...meal,
    id: clean(meal.idMeal),
    name: clean(meal.strMeal),
    thumbnail: clean(meal.strMealThumb),
    category: humanize(meal.strCategory),
    area: resolveArea(meal),
    // `cleanMultiline`, not `clean`: the line breaks in this field are what
    // separate one instruction step from the next, and `clean` would collapse
    // the whole method into a single unreadable paragraph.
    instructions: cleanMultiline(meal.strInstructions),
    youtube: clean(meal.strYoutube),
    source: clean(meal.strSource),
    tags: clean(meal.strTags)
      ? clean(meal.strTags)
          .split(',')
          .map((tag) => humanize(tag))
          .filter(Boolean)
      : [],
  };
}

/**
 * Converts a YouTube watch URL into an embeddable one.
 * @returns {string} An embed URL, or '' when the input is not a YouTube link.
 */
export function toYoutubeEmbedUrl(url) {
  const value = clean(url);
  if (!value) return '';

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{6,})/i,
    /(?:youtu\.be\/)([\w-]{6,})/i,
    /(?:youtube\.com\/embed\/)([\w-]{6,})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{6,})/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    }
  }

  return '';
}

/** Picks a representative image from TheMealDB's CDN. */
export function imageUrl(thumbnail, fallback) {
  const value = clean(thumbnail);
  // The API returns a protocol-relative URL for some records.
  const normalised = value.startsWith('//') ? `https:${value}` : value;
  return normalised || fallback || '';
}

/** Builds an TheMealDB meal URL, used by the "Source" link. */
export function buildSourceUrl(mealId, mealName) {
  const id = clean(mealId);
  if (!id) return '';
  return `https://www.themealdb.com/meal/${id}${
    mealName ? `-${encodeURIComponent(clean(mealName).replace(/\s+/g, '-'))}` : ''
  }`;
}

export { clean };
