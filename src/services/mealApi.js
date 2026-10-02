/**
 * TheMealDB API service.
 *
 * Every network request the app makes goes through this module, which also
 * owns:
 *
 *   - request de-duplication and an in-memory response cache, so navigating
 *     back to a page (or re-running the same filter) does not re-hit the API;
 *   - a retry with backoff, because TheMealDB occasionally drops
 *     connections under rapid requests;
 *   - a mergeable meal store, because TheMealDB returns two different shapes
 *     for the same recipe (see `mergeMeals` below).
 */

const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

/** How long a cached GET stays fresh. Long enough to cover a session of
 *  browsing without pinning data for the life of the tab. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Attempts per request before giving up, including the first one. */
const MAX_ATTEMPTS = 3;

/** Bytes served by TheMealDB images are served separately, so a broken
 *  record never blocks the whole page. */

/* -------------------------------------------------------------------------- */
/* URL + transport                                                             */
/* -------------------------------------------------------------------------- */

/** Builds an endpoint URL, dropping empty/undefined parameters. */
function buildUrl(path, params = {}) {
  const pairs = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    if (trimmed === '') continue;
    pairs.push(`${key}=${encodeURIComponent(trimmed)}`);
  }

  const query = pairs.length ? `?${pairs.join('&')}` : '';
  return `${API_BASE_URL}${path}${query}`;
}

/** Resolves after `ms` milliseconds. */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches a URL, retrying transient network failures with a linear backoff.
 * A non-2xx response is a real answer from the server, so it is not retried —
 * only thrown exceptions are.
 */
async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) {
        await delay(400 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error(`Network request failed: ${url}`);
}

/** Performs one API call and returns the parsed JSON body. */
async function request(path, params) {
  const url = buildUrl(path, params);
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(
      `TheMealDB request to "${path}" failed with status ${response.status}.`,
    );
  }

  const data = await response.json();
  return data ?? {};
}

/**
 * Response cache.
 *
 * `cache` maps a URL to `{ expires, promise }`. Storing the promise (rather
 * than the resolved value) means two components mounting in the same tick
 * share a single in-flight request.
 */
const cache = new Map();

/** `request` plus caching and de-duplication. */
function cachedRequest(path, params, { ttl = CACHE_TTL_MS } = {}) {
  const url = buildUrl(path, params);
  const hit = cache.get(url);

  if (hit && hit.expires > Date.now()) {
    return hit.promise;
  }

  const promise = request(path, params).catch((error) => {
    // A failed response must not be cached, or "Try Again" would replay the
    // same rejection.
    cache.delete(url);
    throw error;
  });

  cache.set(url, { expires: Date.now() + ttl, promise });
  return promise;
}

/** Normalises the `meals` / `categories` envelopes to a plain array. */
const toArray = (list) => (Array.isArray(list) ? list : []);

/* -------------------------------------------------------------------------- */
/* Meal store                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * True when a record carries the fields the detail view renders.
 *
 * TheMealDB returns two shapes for the same meal:
 *
 *   - `filter.php` (category / ingredient listings) returns a summary with
 *     only strMeal, strMealThumb, idMeal, strArea and strCountry.
 *   - `lookup.php?i=` returns the full record, including strInstructions and
 *     the strIngredient1..20 / strMeasure1..20 pairs.
 *
 * Without this check a summary looks identical to "this recipe has no
 * ingredients and no instructions", which is what made the original static
 * build render empty detail pages until a refresh forced a lookup.
 */
function hasDetailData(meal) {
  if (!meal) return false;
  if (meal.strInstructions && String(meal.strInstructions).trim()) return true;

  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    if (ingredient && String(ingredient).trim()) return true;
  }

  return false;
}

/**
 * Merges a batch of records into an existing set, keyed by idMeal.
 *
 * The more complete record becomes the base and empty fields from the other
 * record are filled in, so a `filter.php` summary can never discard detail
 * data that was already fetched.
 */
function mergeMeals(existing = {}, incoming = []) {
  for (const meal of incoming) {
    if (!meal || !meal.idMeal) continue;

    const current = existing[meal.idMeal];
    if (!current) {
      existing[meal.idMeal] = meal;
      continue;
    }
    if (current === meal) continue;

    const base = hasDetailData(current) ? current : meal;
    const other = base === current ? meal : current;
    const merged = { ...base };

    for (const [key, value] of Object.entries(other)) {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = value;
      }
    }

    existing[meal.idMeal] = merged;
  }

  return existing;
}

/** In-memory store of every meal the session has seen, keyed by idMeal. */
const mealsById = {};

/** In-flight `lookup.php` requests, so concurrent detail views share one call. */
const detailRequests = new Map();

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/* -------------------------------------------------------------------------- */

/** `categories.php` — every category with its thumbnail and description. */
export async function getCategories() {
  const data = await cachedRequest('categories.php');
  return toArray(data.categories);
}

/** `search.php?s=` — full meal records whose name or instructions match. */
export async function searchMeals(query) {
  const term = String(query ?? '').trim();
  if (!term) return [];

  const data = await cachedRequest('search.php', { s: term });
  const meals = toArray(data.meals);
  mergeMeals(mealsById, meals);
  return meals;
}

/** `filter.php?c=` — summary records in a category. */
export async function getMealsByCategory(category) {
  const value = String(category ?? '').trim();
  if (!value) return [];

  const data = await cachedRequest('filter.php', { c: value });
  const meals = toArray(data.meals);
  mergeMeals(mealsById, meals);
  return meals;
}

/** `filter.php?i=` — summary records whose main ingredient matches. */
export async function getMealsByIngredient(ingredient) {
  const value = String(ingredient ?? '').trim();
  if (!value) return [];

  const data = await cachedRequest('filter.php', { i: value });
  const meals = toArray(data.meals);
  mergeMeals(mealsById, meals);
  return meals;
}

/** `list.php?i=list` — every known ingredient name, for the filter dropdown. */
export async function listIngredients() {
  const data = await cachedRequest('list.php', { i: 'list' });
  return toArray(data.meals)
    .map((entry) => entry?.strIngredient)
    .filter(Boolean);
}

/** `list.php?c=list` — every known category name. */
export async function listCategories() {
  const data = await cachedRequest('list.php', { c: 'list' });
  return toArray(data.meals)
    .map((entry) => entry?.strCategory)
    .filter(Boolean);
}

/** `latest.php` — most recently added meals. */
export async function getLatestMeals() {
  const data = await cachedRequest('latest.php');
  return toArray(data.meals);
}

/**
 * Returns a full meal record for `id`, from cache when possible.
 *
 * @param {string} id
 * @returns {Promise<object|null>} A record guaranteed to include the detail
 *   fields, or `null` when the meal does not exist.
 */
export function getMealDetails(id) {
  const key = String(id ?? '').trim();
  if (!key) return Promise.resolve(null);

  const known = mealsById[key];
  if (hasDetailData(known)) {
    return Promise.resolve(known);
  }

  const inFlight = detailRequests.get(key);
  if (inFlight) return inFlight;

  const request = cachedRequest('lookup.php', { i: key }, { ttl: Infinity })
    .then((data) => {
      const [meal] = toArray(data.meals);
      detailRequests.delete(key);
      if (!meal) return null;
      mergeMeals(mealsById, [meal]);
      return mealsById[key];
    })
    .catch((error) => {
      detailRequests.delete(key);
      throw error;
    });

  detailRequests.set(key, request);
  return request;
}

/**
 * `random.php` — a single random meal. Deliberately uncached so the button
 * always returns something new.
 */
export async function getRandomMeal() {
  const data = await request('random.php');
  const [meal] = toArray(data.meals);
  if (!meal) return null;
  mergeMeals(mealsById, [meal]);
  return mealsById[meal.idMeal];
}

/**
 * The Recipes page listing.
 *
 * `latest.php` answers anonymous callers with a Patreon placeholder object
 * instead of a list, so the payload is validated and a broad alphabetical
 * search (`search.php?f=`) is used as the fallback. That endpoint returns full
 * records, which is what makes the recipe cards show a real category and area.
 *
 * @param {number} limit Maximum number of meals to return.
 */
export async function getFeaturedMeals(limit = 24) {
  const max = Math.max(1, limit);

  try {
    const latest = await getLatestMeals();
    // A real list has thumbnails; the placeholder does not.
    if (latest.length > 0 && latest[0].strMealThumb) {
      mergeMeals(mealsById, latest);
      return latest.slice(0, max);
    }
  } catch {
    // Fall through to the alphabetical search below.
  }

  const letters = ['a', 'b', 'c', 'd'];

  const batches = await Promise.all(
    letters.map(async (letter) => {
      try {
        const data = await cachedRequest('search.php', { f: letter });
        return toArray(data.meals);
      } catch {
        // One failing letter must not blank the whole page.
        return [];
      }
    }),
  );

  if (batches.every((batch) => batch.length === 0)) {
    throw new Error('No featured meals could be loaded from TheMealDB.');
  }

  mergeMeals(mealsById, batches.flat());

  // Interleave the batches so the grid shows a mix of cuisines rather than
  // four alphabetical blocks.
  const seen = new Set();
  const mixed = [];

  for (let index = 0; index < 60 && mixed.length < max; index += 1) {
    for (const batch of batches) {
      const meal = batch[index];
      if (meal?.idMeal && !seen.has(meal.idMeal)) {
        seen.add(meal.idMeal);
        mixed.push(meal);
      }
    }
  }

  return mixed.slice(0, max);
}


