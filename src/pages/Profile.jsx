import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { providerLabel } from '../services/authService';
import { getUserReviews } from '../services/reviewService';
import { formatDateTime, formatRelativeTime } from '../utils/dates';
import { readReturnPath } from '../utils/navigation';

/**
 * The signed-in visitor's account page.
 *
 * Doubles as the destination after signing in: arriving here signed out sends
 * the browser to `/login` carrying this path, so the round trip ends back
 * where it started. Everything shown is read live from Supabase — the session,
 * the profile row and the person's own reviews — with nothing mirrored into
 * local storage.
 */
export function Profile() {
  const { user, profile, isAuthenticated, loading, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewsToken, setReviewsToken] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setReviews([]);
      setReviewsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError(null);

    getUserReviews(user.id)
      .then((rows) => {
        if (!cancelled) setReviews(rows);
      })
      .catch((error) => {
        if (!cancelled) setReviewsError(error);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, reviewsToken]);

  if (loading) {
    return (
      <div className="container--narrow">
        <Loading label="Loading your profile" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" state={{ from: readReturnPath(location, searchParams) }} replace />
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Recipe lover';
  const email = user?.email ?? '';
  const memberSince = profile?.created_at || user?.created_at;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      toast.success('You have been signed out.');
    } catch (caught) {
      toast.error(caught?.message || 'You could not be signed out.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="page-header">
        <span className="page-header__eyebrow">Your account</span>
        <h1 className="page-header__title">{displayName}</h1>
        <p className="page-header__description">
          Your profile and every rating and comment you have posted.
        </p>
      </header>

      <section className="profile-card" aria-label="Account details">
        <Avatar src={profile?.avatar_url} name={displayName} className="profile-card__avatar" />

        <div className="profile-card__body">
          <p className="profile-card__name">{displayName}</p>
          <p className="profile-card__email">{email}</p>
          <p className="profile-card__meta">
            Signed in with {providerLabel(profile?.provider || user?.app_metadata?.provider)}
            {memberSince ? ` · Member since ${formatDateTime(memberSince).split(',')[0]}` : ''}
          </p>
        </div>

        <div className="profile-card__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing out...' : 'Log out'}
          </button>
        </div>
      </section>

      <section className="profile__section" aria-labelledby="my-reviews-heading">
        <div className="profile__section-header">
          <h2 className="profile__section-title" id="my-reviews-heading">
            Your reviews
          </h2>
          <span className="profile__section-count">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {reviewsLoading ? (
          <Loading label="Loading your reviews" small />
        ) : reviewsError ? (
          <ErrorMessage
            error={reviewsError}
            title="We could not load your reviews."
            onRetry={() => setReviewsToken((token) => token + 1)}
          />
        ) : reviews.length === 0 ? (
          <div className="profile__empty">
            <p className="profile__empty-title">You have not reviewed anything yet.</p>
            <p className="profile__empty-text">
              Rate a recipe and it will show up here.
            </p>
            <Link className="btn btn--secondary" to="/recipes">
              Browse recipes
            </Link>
          </div>
        ) : (
          <ul className="profile-review-list">
            {reviews.map((review) => (
              <li className="profile-review" key={review.id}>
                <div className="profile-review__header">
                  <StarRating value={review.rating ?? 0} />
                  <time
                    className="profile-review__date"
                    dateTime={review.createdAt}
                    title={formatDateTime(review.createdAt)}
                  >
                    {formatRelativeTime(review.createdAt)}
                  </time>
                </div>

                {review.comment ? (
                  <p className="profile-review__comment">{review.comment}</p>
                ) : (
                  <p className="profile-review__comment profile-review__comment--muted">
                    Rating only, no comment.
                  </p>
                )}

                <Link className="profile-review__link" to={`/recipe/${review.recipeId}`}>
                  {review.recipeName || `Recipe ${review.recipeId}`}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default Profile;
