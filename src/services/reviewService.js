import { authError, requireSupabase, toServiceError, validationError } from './supabase';

/**
 * Recipe review service — ratings and comments stored in Supabase.
 *
 * TheMealDB stays the source of truth for recipe content; this module only
 * ever touches user-generated rows, keyed by TheMealDB's `idMeal` so a review
 * belongs to exactly one recipe across the whole collection.
 *
 * One user + one recipe = one review row (enforced by a UNIQUE constraint).
 * Rating and comment are fields of that single row, so re-rating never
 * creates a duplicate and a comment can be added before or after the rating.
 *
 * Everything runs through the shared client from `./supabase` — the same one
 * `authService.js` signs in with — and every failure leaves this file with a
 * `kind` (`ENVIRONMENT_ERROR`, `DATABASE_ERROR`, `RLS_ERROR`, `NETWORK_ERROR`,
 * `VALIDATION_ERROR`) plus a sentence that is safe to show, so a missing table
 * is never reported as "add your Supabase keys".
 *
 * All reads and writes run through RLS: reads are public, writes require an
 * authenticated session and can only touch the caller's own row.
 */

/** Longest comment accepted, both here and in the database CHECK. */
export const MAX_COMMENT_LENGTH = 500;

/** Rating bounds, mirrored by the CHECK constraint on the table. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Control characters that must never reach the database or the DOM. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Throws when Supabase is unavailable, with the configuration message. */
function guard() {
  return requireSupabase();
}

/**
 * Awaits a Supabase builder and turns any failure — a rejected promise or a
 * returned `{error}` — into an error with a `kind` and a safe message.
 */
async function run(builder, overrides = {}) {
  let result;

  try {
    result = await builder;
  } catch (error) {
    throw toServiceError(error, overrides);
  }

  if (result?.error) throw toServiceError(result.error, overrides);
  return result;
}

/** Rounds to one decimal place, the way averages are displayed. */
const round1 = (value) => Math.round(Number(value) * 10) / 10;

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Validates a star rating.
 * @returns {{ok: boolean, value?: number, error?: string}}
 */
export function validateRating(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return { ok: false, error: 'Choose a star rating first.' };
  if (numeric < RATING_MIN || numeric > RATING_MAX) {
    return { ok: false, error: 'Ratings run from 1 to 5 stars.' };
  }
  return { ok: true, value: round1(numeric) };
}

/**
 * Trims, strips control characters and enforces the length limit.
 * @returns {{ok: boolean, value?: string, error?: string}}
 */
export function sanitizeComment(text) {
  const value = String(text ?? '')
    .replace(CONTROL_CHARACTERS, '')
    .trim();

  if (!value) return { ok: false, error: 'Write something before posting.' };
  if (value.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Comments are limited to ${MAX_COMMENT_LENGTH} characters.` };
  }
  return { ok: true, value };
}

/* -------------------------------------------------------------------------- */
/* Rating statistics                                                           */
/* -------------------------------------------------------------------------- */

/** Builds the `{average, count}` shape from raw rating rows. */
function statsFromRows(rows) {
  const grouped = new Map();

  for (const row of rows ?? []) {
    if (!row?.recipe_id) continue;
    const entry = grouped.get(row.recipe_id) ?? { sum: 0, count: 0 };
    entry.sum += Number(row.rating) || 0;
    entry.count += 1;
    grouped.set(row.recipe_id, entry);
  }

  const result = {};
  for (const [recipeId, entry] of grouped) {
    // One decimal place, never an integer: 4.7 stays 4.7, 5.0 stays 5.0.
    result[recipeId] = { average: round1(entry.sum / entry.count), count: entry.count };
  }
  return result;
}

/**
 * Average rating and rating count for one recipe.
 *
 * @param {string} recipeId TheMealDB `idMeal`.
 * @returns {Promise<{average: number|null, count: number}>}
 */
export async function getRecipeRating(recipeId) {
  const id = String(recipeId ?? '').trim();
  if (!id) return { average: null, count: 0 };

  const map = await getRatingsForRecipes([id]);
  return map[id] ?? { average: null, count: 0 };
}

/**
 * Spec name for {@link getRecipeRating} — average plus rating count.
 *
 * @param {string} recipeId TheMealDB `idMeal`.
 * @returns {Promise<{average: number|null, count: number}>}
 */
export async function getRecipeRatingSummary(recipeId) {
  return getRecipeRating(recipeId);
}

/**
 * Rating statistics for many recipes in one request.
 *
 * Prefers the `recipe_ratings` view (AVG/COUNT computed in the database) and
 * falls back to aggregating raw rows when the view has not been created yet.
 *
 * @param {string[]} recipeIds
 * @returns {Promise<Record<string, {average: number|null, count: number}>>}
 */
export async function getRatingsForRecipes(recipeIds) {
  const ids = [...new Set((recipeIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return {};

  const client = guard();

  const { data, error } = await client
    .from('recipe_ratings')
    .select('recipe_id, average_rating, rating_count')
    .in('recipe_id', ids);

  if (!error && Array.isArray(data)) {
    const map = {};
    for (const row of data) {
      map[row.recipe_id] = {
        average: row.average_rating === null ? null : round1(row.average_rating),
        count: Number(row.rating_count) || 0,
      };
    }
    // Ids absent from the view have no ratings at all.
    for (const id of ids) if (!map[id]) map[id] = { average: null, count: 0 };
    return map;
  }

  // The view is missing (or unreadable): aggregate the rows directly. If the
  // table itself is missing or blocked, this second attempt throws the error
  // that describes the real state (table / permissions / network).
  const { data: rows } = await run(
    client.from('recipe_reviews').select('recipe_id, rating').in('recipe_id', ids),
  );

  const map = statsFromRows(rows);
  for (const id of ids) if (!map[id]) map[id] = { average: null, count: 0 };
  return map;
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

/** Selects a review row together with its author's public profile fields. */
const REVIEW_SELECT =
  'id, recipe_id, user_id, rating, comment, created_at, updated_at, profile:profiles(full_name, avatar_url)';

/** Normalises a joined row into the shape the components render. */
function normalizeReview(row) {
  if (!row) return null;
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;

  return {
    id: row.id,
    recipeId: row.recipe_id,
    userId: row.user_id,
    rating: row.rating === null ? null : Number(row.rating),
    comment: row.comment ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: profile?.full_name || 'Recipe lover',
    avatarUrl: profile?.avatar_url || null,
  };
}

/**
 * Commented reviews for one recipe, newest first.
 *
 * Rating-only rows are excluded: they carry no comment to display.
 *
 * @returns {Promise<{reviews: object[], total: number}>}
 */
export async function getRecipeReviews(recipeId, { limit = 10, offset = 0 } = {}) {
  const id = String(recipeId ?? '').trim();
  if (!id) return { reviews: [], total: 0 };

  const client = guard();
  const to = offset + limit - 1;

  let result;

  try {
    result = await client
      .from('recipe_reviews')
      .select(REVIEW_SELECT, { count: 'exact' })
      .eq('recipe_id', id)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .range(offset, to);
  } catch (error) {
    result = { error };
  }

  if (result.error) {
    // A missing `profiles` table would take the whole list down; retry without
    // the join so reviews still render with a generic author. When the retry
    // fails too, the thrown error describes the real state — table missing,
    // permissions or network — rather than a generic "not set up".
    try {
      result = await client
        .from('recipe_reviews')
        .select('id, recipe_id, user_id, rating, comment, created_at, updated_at', {
          count: 'exact',
        })
        .eq('recipe_id', id)
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, to);
    } catch (error) {
      throw toServiceError(error);
    }

    if (result.error) throw toServiceError(result.error);
  }

  return { reviews: (result.data ?? []).map(normalizeReview), total: result.count ?? 0 };
}

/** The signed-in user's own review for a recipe, or `null`. */
export async function getUserReview(recipeId, userId) {
  if (!recipeId || !userId) return null;

  const client = guard();
  const { data } = await run(
    client
      .from('recipe_reviews')
      .select(REVIEW_SELECT)
      .eq('recipe_id', String(recipeId))
      .eq('user_id', userId)
      .maybeSingle(),
  );

  return normalizeReview(data);
}

/**
 * The current session's own review for a recipe, or `null`.
 *
 * The user id comes from Supabase's session, never from the caller.
 *
 * @param {string} recipeId TheMealDB `idMeal`.
 */
export async function getCurrentUserReview(recipeId) {
  const client = guard();
  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  return getUserReview(recipeId, userId);
}

/** Reads the authenticated user's id, or throws an "please sign in" error. */
async function requireUserId() {
  const client = guard();
  const { data, error } = await client.auth.getSession();

  if (error) throw toServiceError(error);
  const userId = data?.session?.user?.id;
  if (!userId) throw authError('Please sign in to rate or comment on recipes.');

  return userId;
}

/**
 * Creates the caller's review, or replaces it when one already exists.
 *
 * `user_id` is taken from the authenticated session — never from the browser —
 * and the UNIQUE `(recipe_id, user_id)` constraint plus `onConflict` turn a
 * second rating into an update instead of a duplicate.
 *
 * @param {string} recipeId TheMealDB `idMeal`.
 * @param {number} rating 1–5.
 * @param {string|null} [comment] Optional comment stored on the same row.
 */
export async function createReview(recipeId, rating, comment = null) {
  const userId = await requireUserId();
  return submitReview({ recipeId, rating, comment, userId });
}

/**
 * Writes a review row for an explicit user id.
 *
 * Prefer {@link createReview}; this form exists for callers that already hold
 * the id from the session. RLS re-checks the id against `auth.uid()` anyway,
 * so a wrong value can only make the write fail — never land on someone else's
 * row.
 *
 * @param {{recipeId: string, rating: number, comment?: string|null, userId: string}} input
 */
export async function submitReview({ recipeId, rating, comment = null, userId }) {
  const validated = validateRating(rating);
  if (!validated.ok) throw validationError(validated.error);

  let storedComment = null;

  if (comment !== null && comment !== undefined && String(comment).trim() !== '') {
    const check = sanitizeComment(comment);
    if (!check.ok) throw validationError(check.error);
    storedComment = check.value;
  }

  if (!userId) throw authError('Please sign in to rate or comment on recipes.');

  const client = guard();
  const now = new Date().toISOString();

  const { data } = await run(
    client
      .from('recipe_reviews')
      .upsert(
        {
          recipe_id: String(recipeId),
          user_id: userId,
          rating: validated.value,
          comment: storedComment,
          updated_at: now,
        },
        { onConflict: 'recipe_id,user_id' },
      )
      .select(REVIEW_SELECT)
      .single(),
    {
      '23505': 'You have already reviewed this recipe.',
      '23514': 'Ratings run from 1 to 5 stars.',
      '42501': 'You need to be signed in to review recipes.',
      PGRST301: 'You need to be signed in to review recipes.',
    },
  );

  return normalizeReview(data);
}

/**
 * Updates the comment (and optionally the rating) of the caller's own review.
 * `recipe_id` and `user_id` are never part of the payload.
 *
 * @param {{reviewId: string, comment?: string|null, rating?: number}} input
 */
export async function updateReview({ reviewId, comment, rating }) {
  const client = guard();

  const patch = { updated_at: new Date().toISOString() };

  if (comment !== undefined) {
    const check = sanitizeComment(comment);
    if (!check.ok) throw validationError(check.error);
    patch.comment = check.value;
  }

  if (rating !== undefined) {
    const check = validateRating(rating);
    if (!check.ok) throw validationError(check.error);
    patch.rating = check.value;
  }

  const { data } = await run(
    client.from('recipe_reviews').update(patch).eq('id', reviewId).select(REVIEW_SELECT).single(),
    {
      PGRST116: 'You can only edit your own comments.',
      '42501': 'You can only edit your own comments.',
    },
  );

  return normalizeReview(data);
}

/** Deletes the caller's own review. RLS blocks anyone else's rows. */
export async function deleteReview(reviewId) {
  const client = guard();

  await run(client.from('recipe_reviews').delete().eq('id', reviewId), {
    '42501': 'You can only delete your own comments.',
    PGRST116: 'You can only delete your own comments.',
  });
}

/**
 * Every review written by one user, newest first — the "My Reviews" list.
 *
 * Recipe titles are resolved from TheMealDB afterwards; a lookup failure
 * degrades to the id rather than losing the review.
 *
 * @returns {Promise<object[]>}
 */
export async function getUserReviews(userId, { limit = 50 } = {}) {
  if (!userId) return [];

  const client = guard();
  const { data } = await run(
    client
      .from('recipe_reviews')
      .select(REVIEW_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  );

  const reviews = (data ?? []).map(normalizeReview);
  const { getMealDetails } = await import('./mealApi');

  await Promise.all(
    reviews.map(async (review) => {
      try {
        const meal = await getMealDetails(review.recipeId);
        review.recipeName = meal?.strMeal ?? null;
      } catch {
        review.recipeName = null;
      }
    }),
  );

  return reviews;
}
