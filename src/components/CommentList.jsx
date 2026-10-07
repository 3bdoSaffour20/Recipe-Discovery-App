import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { formatDateTime, formatRelativeTime } from '../utils/dates';
import { Avatar } from './Avatar';
import { CommentForm } from './CommentForm';
import { StarRating } from './StarRating';

/**
 * The comment thread for one recipe.
 *
 * Only the author of a comment sees Edit and Delete; edit swaps the text for
 * a textarea with Save/Cancel, and delete asks for confirmation first. Both
 * operations run through the parent, which owns the data, so the list and the
 * rating statistics refresh together.
 *
 * @param {object} props
 * @param {object[]} props.reviews Normalised reviews with comments.
 * @param {string|null} props.currentUserId Signed-in user, or null.
 * @param {(review: object, comment: string) => Promise<void>} props.onEdit
 * @param {(review: object) => Promise<void>} props.onDelete
 */
export function CommentList({ reviews, currentUserId, onEdit, onDelete }) {
  const toast = useToast();

  const [editingId, setEditingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  function startEditing(review) {
    setConfirmingId(null);
    setEditingId(review.id);
  }

  function startConfirming(review) {
    setEditingId(null);
    setConfirmingId(review.id);
  }

  function handleEdit(review) {
    return async ({ comment }) => {
      await onEdit(review, comment);
      setEditingId(null);
    };
  }

  async function handleDelete(review) {
    setDeletingId(review.id);
    try {
      await onDelete(review);
      setConfirmingId(null);
    } catch (error) {
      toast.error(error?.message || 'Your comment could not be deleted.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="comment-list">
      {reviews.map((review) => {
        const isMine = Boolean(currentUserId) && review.userId === currentUserId;
        const isEditing = editingId === review.id;
        const isConfirming = confirmingId === review.id;
        const isDeleting = deletingId === review.id;

        return (
          <li className="comment" key={review.id}>
            <Avatar
              src={review.avatarUrl}
              name={review.authorName}
              className="avatar--sm comment__avatar"
            />

            <div className="comment__body">
              <div className="comment__header">
                <span className="comment__author">{review.authorName}</span>
                <time
                  className="comment__date"
                  dateTime={review.createdAt}
                  title={formatDateTime(review.createdAt)}
                >
                  {formatRelativeTime(review.createdAt)}
                </time>
              </div>

              {review.rating ? (
                <span className="comment__rating">
                  <StarRating value={review.rating} />
                </span>
              ) : null}

              {isEditing ? (
                <CommentForm
                  inputId="edit-comment-input"
                  legend="Edit your comment"
                  placeholder="Update your comment..."
                  initialValue={review.comment}
                  existingRating={review.rating}
                  submitLabel="Save"
                  pendingLabel="Saving..."
                  onSubmit={handleEdit(review)}
                  onCancel={() => setEditingId(null)}
                />
              ) : isConfirming ? (
                <div className="comment__confirm">
                  <p className="comment__confirm-text">
                    Are you sure you want to delete this comment?
                  </p>
                  <div className="comment__actions">
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDelete(review)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirmingId(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="comment__text">{review.comment}</p>

                  {isMine ? (
                    <div className="comment__actions">
                      <button
                        type="button"
                        className="comment__action"
                        onClick={() => startEditing(review)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="comment__action comment__action--danger"
                        onClick={() => startConfirming(review)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default CommentList;
