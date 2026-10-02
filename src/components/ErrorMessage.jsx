import { AlertIcon } from './Icons';

/**
 * Error state for a failed API request.
 *
 * `role="alert"` announces the failure to screen readers as soon as it
 * appears, which matters because the loading state it replaces was announced
 * politely a moment earlier.
 *
 * @param {object} props
 * @param {Error} [props.error] The caught error, shown in place of the
 *   generic message when it is not a network failure.
 * @param {() => void} [props.onRetry]
 * @param {string} [props.title]
 * @param {string} [props.message]
 */
export function ErrorMessage({
  error,
  onRetry,
  title = 'Something went wrong.',
  message,
}) {
  // Network failures have no useful detail for a visitor; anything else
  // (a malformed payload, an unexpected server response) may help.
  const isNetworkError =
    error instanceof TypeError || /failed to fetch|network|load failed/i.test(error?.message ?? '');

  const description = message ?? (error && !isNetworkError ? error.message : undefined);

  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        <AlertIcon />
      </span>
      <h2 className="state__title">{title}</h2>
      <p className="state__message">
        {description ?? 'Unable to load recipes. Please try again.'}
      </p>
      {onRetry ? (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try Again
        </button>
      ) : null}
    </div>
  );
}

export default ErrorMessage;