import { useState } from 'react';
import { MAX_COMMENT_LENGTH, sanitizeComment } from '../services/reviewService';
import { StarRating } from './StarRating';

/**
 * Comment box — used for a new comment and for editing an existing one.
 *
 * A comment always belongs to a review row, and a review row always carries a
 * rating, so when the person has not rated the recipe yet the form shows a
 * required star picker alongside the textarea instead of failing after the
 * fact. Validation happens before submit, errors are announced with
 * `role="alert"`, and the button labels its own pending state so a double tap
 * cannot post twice.
 *
 * @param {object} props
 * @param {string} [props.inputId] Unique id, so two forms never collide.
 * @param {string} [props.legend] Label above the textarea.
 * @param {string} [props.placeholder]
 * @param {string} [props.initialValue]
 * @param {number|null} [props.existingRating] The rating already saved for
 *   this recipe; `null` means "ask for one".
 * @param {string} [props.submitLabel]
 * @param {string} [props.pendingLabel]
 * @param {(input: {comment: string, rating: number|null}) => Promise<void>} props.onSubmit
 * @param {() => void} [props.onCancel]
 */
export function CommentForm({
  inputId = 'comment-input',
  legend = 'Your Comment',
  placeholder = 'Write your comment here...',
  initialValue = '',
  existingRating = null,
  submitLabel = 'Post Comment',
  pendingLabel = 'Posting...',
  onSubmit,
  onCancel,
}) {
  const [text, setText] = useState(initialValue);
  const [localRating, setLocalRating] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const needsRating = existingRating === null || existingRating === undefined;
  const remaining = MAX_COMMENT_LENGTH - text.length;
  const helpId = `${inputId}-help`;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const check = sanitizeComment(text);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    if (needsRating && !localRating) {
      setError('Choose a star rating before posting your comment.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await onSubmit({
        comment: check.value,
        rating: needsRating ? localRating : existingRating,
      });
      setText('');
      setLocalRating(null);
    } catch (caught) {
      setError(caught?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit} noValidate>
      <label className="comment-form__label" htmlFor={inputId}>
        {legend}
      </label>

      <textarea
        id={inputId}
        className="input comment-form__textarea"
        rows={4}
        value={text}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        aria-describedby={helpId}
        aria-invalid={Boolean(error)}
        disabled={submitting}
      />

      {needsRating ? (
        <div className="comment-form__rating">
          <span className="comment-form__label">Your rating</span>
          <StarRating
            value={localRating}
            onChange={setLocalRating}
            interactive
            label="Your rating for this recipe"
          />
        </div>
      ) : null}

      <div className="comment-form__footer">
        <span className="comment-form__count" id={helpId}>
          Characters remaining: {remaining}
        </span>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="comment-form__actions">
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? pendingLabel : submitLabel}
        </button>

        {onCancel ? (
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default CommentForm;
