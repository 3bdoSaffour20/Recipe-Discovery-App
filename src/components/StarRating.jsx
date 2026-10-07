import { useState } from 'react';

const STARS = [1, 2, 3, 4, 5];
const STAR_GLYPHS = '★★★★★';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Star rating display and picker.
 *
 * Read-only mode renders a fractional fill, so an average of 4.7 shows four
 * full stars and most of a fifth rather than rounding up to five — the fill is
 * an absolutely positioned copy of the same glyphs clipped to `value / 5` of
 * the width, which is exact at any font size.
 *
 * Interactive mode is a radio group: one Tab stop (roving `tabindex`), arrow
 * keys to move, Enter/Space to pick, and a hover preview of the choice.
 *
 * @param {object} props
 * @param {number} [props.value] Rating from 0 to 5 (decimals allowed).
 * @param {(value: number) => void} [props.onChange] Enables interactive mode.
 * @param {boolean} [props.interactive] Force pickers/fill to match usage.
 * @param {string} [props.label] Accessible name for the group.
 */
export function StarRating({ value = 0, onChange, interactive = false, label = 'Rating' }) {
  const [hovered, setHovered] = useState(null);

  const numeric = Number(value) || 0;
  const canPick = Boolean(interactive && typeof onChange === 'function');

  if (!canPick) {
    const safe = clamp(numeric, 0, 5);
    const percent = (safe / 5) * 100;

    return (
      <span
        className="star-rating"
        role="img"
        aria-label={safe > 0 ? `Rated ${safe.toFixed(1)} out of 5 stars` : 'No ratings yet'}
      >
        <span className="star-rating__track" aria-hidden="true">
          <span className="star-rating__base">{STAR_GLYPHS}</span>
          <span className="star-rating__fill" style={{ width: `${percent}%` }}>
            {STAR_GLYPHS}
          </span>
        </span>
      </span>
    );
  }

  const preview = hovered ?? numeric;

  function handleKeyDown(event) {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!delta) return;

    event.preventDefault();
    const current = Number(event.currentTarget.dataset.value);
    const next = clamp(current + delta, 1, 5);
    onChange(next);

    const group = event.currentTarget.parentElement;
    group?.querySelector(`[data-value="${next}"]`)?.focus();
  }

  return (
    <div
      className="star-rating star-rating--interactive"
      role="radiogroup"
      aria-label={label}
      onMouseLeave={() => setHovered(null)}
    >
      {STARS.map((star) => {
        const isActive = star <= preview;
        const isTabStop = Number(numeric) === star || (!numeric && star === 1);

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={Number(numeric) === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            data-value={star}
            tabIndex={isTabStop ? 0 : -1}
            className={isActive ? 'star-rating__button is-active' : 'star-rating__button'}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onKeyDown={handleKeyDown}
            onClick={() => onChange(star)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default StarRating;
