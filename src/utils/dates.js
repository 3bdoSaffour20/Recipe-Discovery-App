/**
 * Date formatting helpers for user-generated content.
 * Pure functions: no React, no network.
 */

/** Units used to pick the right word for a relative timestamp. */
const UNITS = [
  { limit: 60, divisor: 1, singular: 'second', plural: 'seconds' },
  { limit: 3600, divisor: 60, singular: 'minute', plural: 'minutes' },
  { limit: 86400, divisor: 3600, singular: 'hour', plural: 'hours' },
  { limit: 604800, divisor: 86400, singular: 'day', plural: 'days' },
  { limit: 2592000, divisor: 604800, singular: 'week', plural: 'weeks' },
  { limit: 31536000, divisor: 2592000, singular: 'month', plural: 'months' },
  { limit: Number.POSITIVE_INFINITY, divisor: 31536000, singular: 'year', plural: 'years' },
];

/**
 * "2 days ago", "just now", "3 months ago".
 *
 * Falls back to a date string for anything unparseable, so a corrupt
 * timestamp never renders as "NaN days ago".
 *
 * @param {string|number|Date} value
 * @param {number} [now] Epoch millis, injectable for tests.
 */
export function formatRelativeTime(value, now = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const elapsed = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (elapsed < 45) return 'just now';

  const unit = UNITS.find((entry) => elapsed < entry.limit) ?? UNITS[UNITS.length - 1];
  const amount = Math.floor(elapsed / unit.divisor);

  return `${amount} ${amount === 1 ? unit.singular : unit.plural} ago`;
}

/** Locale-aware absolute date, e.g. "4 Oct 2026, 14:05". */
export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
