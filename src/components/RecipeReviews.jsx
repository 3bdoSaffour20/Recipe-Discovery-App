import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRecipeRating } from '../context/RatingsContext';
import { useToast } from '../context/ToastContext';
import { useSupabaseStatus } from '../hooks/useSupabaseStatus';
import {
  createReview,
  deleteReview,
  getRecipeReviews,
  getCurrentUserReview,
  updateReview,
} from '../services/reviewService';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { ErrorMessage } from './ErrorMessage';
import { Loading } from './Loading';
import { ProtectedAction } from './ProtectedAction';
import { RecipeRatingSummary } from './RecipeRatingSummary';
import { StarRating } from './StarRating';

/** Comments fetched per request; "Load More" appends the next batch. */
const PAGE_SIZE = 10;

/**
 * The rating and comment section of a recipe page.
 *
 * One `recipe_reviews` row per user holds both the rating and the comment, so
 * this component owns the whole lifecycle: reading the public statistics,
 * capturing the visitor's own review, and writing back through the service.
 *
 * What is on screen follows the *actual* backend state from
 * `useSupabaseStatus()` — not a guess:
 *
 *   - Supabase working        → everything behaves normally, no warnings;
 *   - keys missing            → one configuration note, no fake login gate;
 *   - table / permissions bad → the specific database message;
 *   - network down            → "unable to connect", with a retry.
 *
 * Nothing here trusts the browser for identity — the service takes the user id
 * from the session and RLS enforces it — and every mutation immediately
 * refreshes the shared rating cache so the summary, the card and the sort order
 * stay in step.
 *
 * @param {{recipeId: string}} props TheMealDB `idMeal`.
 */
export function RecipeReviews({ recipeId }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const status = useSupabaseStatus();

  const { rating: summary, refresh: refreshSummary } = useRecipeRating(recipeId);

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [myReview, setMyReview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
    refreshSummary();
  }, [refreshSummary]);

  /* Comments ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    if (!status.configured) {
      // No keys at all: there is nothing to query, and the configuration
      // notice above already says so far more precisely than an error would.
      setReviews([]);
      setTotal(0);
      setListError(null);
      setListLoading(false);
      return undefined;
    }

    setListLoading(true);
    setListError(null);

    getRecipeReviews(recipeId, { limit: PAGE_SIZE, offset: 0 })
      .then(({ reviews: first, total: count }) => {
        if (cancelled) return;
        setReviews(first);
        setTotal(count);
      })
      .catch((error) => {
        if (!cancelled) setListError(error);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recipeId, reloadToken, status.configured]);

  /* This visitor's own review ---------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    if (!recipeId || !user?.id) {
      setMyReview(null);
      setSelected(null);
      return undefined;
    }

    getCurrentUserReview(recipeId)
      .then((row) => {
        if (cancelled) return;
        setMyReview(row);
        setSelected(row?.rating ?? null);
      })
      .catch(() => {
        // A missing profile row or offline read must not block the section.
        if (!cancelled) setMyReview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [recipeId, user?.id]);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const { reviews: next, total: count } = await getRecipeReviews(recipeId, {
        limit: PAGE_SIZE,
        offset: reviews.length,
      });
      setReviews((current) => [...current, ...next]);
      setTotal(count);
    } catch (error) {
      setListError(error);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleRate() {
    if (!user || !selected) {
      toast.error('Choose a star rating first.');
      return;
    }

    setSubmittingRating(true);
    try {
      // The existing comment rides along so re-rating never wipes it. The user
      // id comes from the Supabase session inside the service, never from here.
      const saved = await createReview(recipeId, selected, myReview?.comment || null);

      const isUpdate = Boolean(myReview?.rating);
      setMyReview(saved);
      refresh();
      toast.success(isUpdate ? 'Rating updated successfully.' : 'Rating submitted successfully.');
    } catch (error) {
      toast.error(error?.message || 'Your rating could not be saved.');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handlePostComment({ comment, rating }) {
    const saved = await createReview(recipeId, rating, comment);

    setMyReview(saved);
    setSelected(saved.rating);
    refresh();
    toast.success('Comment posted successfully.');
  }

  async function handleEditComment(review, comment) {
    const updated = await updateReview({ reviewId: review.id, comment });

    setReviews((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    );
    if (myReview?.id === updated.id) setMyReview(updated);

    refreshSummary();
    toast.success('Comment updated successfully.');
  }

  async function handleDeleteComment(review) {
    await deleteReview(review.id);

    setReviews((current) => current.filter((item) => item.id !== review.id));
    setTotal((count) => Math.max(0, count - 1));

    if (myReview?.id === review.id) {
      setMyReview(null);
      setSelected(null);
    }

    refresh();
    toast.success('Comment deleted successfully.');
  }

  const hasMore = reviews.length < total;
  const canPostComment = isAuthenticated && Boolean(user);

  return (
    <section className="reviews" aria-labelledby="reviews-heading">
      <div className="reviews__header">
        <h2 className="reviews__title" id="reviews-heading">
          Ratings &amp; Comments
        </h2>

        <RecipeRatingSummary recipeId={recipeId} rating={summary ?? undefined} />
      </div>

      {summary && summary.count === 0 ? (
        <p className="reviews__hint">Be the first to rate this recipe!</p>
      ) : null}

      {/* One notice, and only when something is genuinely wrong. A working
          Supabase project shows nothing here at all. */}
      {!status.loading && status.message && !listError ? (
        <p className="reviews__notice" role="status">
          {status.message}
        </p>
      ) : null}

      {/* Rating ------------------------------------------------------- */}
      <div className="reviews__panel">
        <h3 className="reviews__subtitle">Rate this recipe</h3>

        {myReview?.rating ? (
          <p className="reviews__your-rating">
            Your rating:
            <span className="reviews__your-stars">
              <StarRating value={myReview.rating} />
            </span>
          </p>
        ) : (
          <p className="reviews__your-rating">Pick the stars that match your experience.</p>
        )}

        <ProtectedAction message="Please log in to rate this recipe.">
          <div className="reviews__rate-controls">
            <StarRating
              value={selected}
              onChange={setSelected}
              interactive
              label="Rate this recipe out of 5 stars"
            />
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRate}
              disabled={submittingRating || !selected}
            >
              {submittingRating
                ? 'Submitting...'
                : myReview?.rating
                  ? 'Update Rating'
                  : 'Submit Rating'}
            </button>
          </div>
        </ProtectedAction>
      </div>

      {/* Comments ----------------------------------------------------- */}
      <div className="reviews__panel">
        <h3 className="reviews__subtitle">Comments</h3>

        {canPostComment ? (
          <CommentForm
            inputId="new-comment-input"
            existingRating={myReview?.rating ?? null}
            onSubmit={handlePostComment}
          />
        ) : (
          <div className="reviews__gate">
            <p className="reviews__gate-text">
              Share how this recipe turned out for you.
            </p>
            <ProtectedAction message="Please log in to leave a comment.">
              <button type="button" className="btn btn--secondary">
                Write a Comment
              </button>
            </ProtectedAction>
          </div>
        )}

        {!status.configured ? null : listLoading ? (
          <Loading label="Loading comments" small />
        ) : listError ? (
          <ErrorMessage
            error={listError}
            onRetry={refresh}
            title="We could not load these comments."
          />
        ) : reviews.length === 0 ? (
          <div className="reviews__empty">
            <p className="reviews__empty-title">No comments yet.</p>
            <p className="reviews__empty-text">Be the first to share your experience.</p>
          </div>
        ) : (
          <>
            <CommentList
              reviews={reviews}
              currentUserId={user?.id ?? null}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
            />

            {hasMore ? (
              <div className="cluster cluster--center mt-4">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default RecipeReviews;
