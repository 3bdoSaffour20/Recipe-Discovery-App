import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon, SearchIcon } from './Icons';

/**
 * Recipe search field.
 *
 * Submits to `/search?query=...` on Enter or button press. The field is
 * uncontrolled after mount so typing is never interrupted by a re-render,
 * and is synced from the URL only when the `value` prop actually changes —
 * which is what lets the search box live in the persistent header.
 *
 * On phones the input and button stack so both keep a 44px touch target;
 * from 480px up they share a row.
 *
 * @param {object} props
 * @param {string} [props.value] Initial term, e.g. from the URL.
 * @param {string} [props.placeholder]
 * @param {string} [props.label] Accessible label for the input.
 * @param {string} [props.className] Applied to the form.
 * @param {boolean} [props.showLabel] Render a visible label (skip-link target).
 * @param {'search'|'form'} [props.role]
 * @param {(query: string) => void} [props.onSearch] Called instead of
 *   navigating when supplied.
 * @param {(value: string) => void} [props.onValueChange]
 */
export function SearchBar({
  value: initialValue = '',
  placeholder = 'Search for recipes...',
  label = 'Search for recipes',
  className = '',
  showLabel = false,
  role = 'search',
  onSearch,
  onValueChange,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const inputId = useId();

  const [term, setTerm] = useState(initialValue);

  // Adopt a new externally supplied term (e.g. the user used the browser back
  // button) without clobbering what they are currently typing.
  useEffect(() => {
    setTerm(initialValue);
  }, [initialValue]);

  function handleChange(event) {
    const next = event.target.value;
    setTerm(next);
    onValueChange?.(next);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const query = term.trim();
    if (!query) {
      // Nothing to search for: return focus to the field instead of
      // navigating to an empty results page.
      inputRef.current?.focus();
      return;
    }

    if (onSearch) {
      onSearch(query);
      return;
    }

    navigate(`/search?query=${encodeURIComponent(query)}`);
  }

  function handleClear() {
    setTerm('');
    onValueChange?.('');
    inputRef.current?.focus();
  }

  const hasValue = term.length > 0;

  return (
    <form
      className={`search-form ${className}`.trim()}
      role={role}
      onSubmit={handleSubmit}
    >
      {showLabel ? (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div className="search-form__input-wrap">
        <span className="search-form__icon">
          <SearchIcon />
        </span>

        <input
          ref={inputRef}
          id={inputId}
          className="input search-form__input"
          type="search"
          name="query"
          value={term}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label={showLabel ? undefined : label}
          autoComplete="off"
          // Suppresses the WebKit "search" decorations, which add a second
          // clear button on top of our own.
          enterKeyHint="search"
        />

        {hasValue ? (
          <button
            type="button"
            className="search-form__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <CloseIcon width="16" height="16" />
          </button>
        ) : null}
      </div>

      <button type="submit" className="btn btn--primary search-form__submit">
        Search
      </button>
    </form>
  );
}

export default SearchBar;