import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../data/navigation';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useOnEscape } from '../hooks/useOnEscape';
import { CloseIcon, LogoIcon } from './Icons';
import { SearchBar } from './SearchBar';

/**
 * Slide-in navigation drawer for small screens.
 *
 * Accessibility notes:
 *   - focus moves into the drawer when it opens and returns to the toggle when
 *     it closes, so keyboard users are never stranded behind the overlay;
 *   - Tab is kept inside the drawer while it is open, so a modal that lets
 *     focus escape into the page behind it is not really modal;
 *   - Escape closes it, as does a click on the scrim or any link;
 *   - `aria-modal` + `role="dialog"` announce it as a modal surface;
 *   - search lives here too, because the header search is hidden below 1024px
 *     and search has to stay reachable on a phone.
 *
 * @param {{open: boolean, onClose: () => void, searchValue?: string}} props
 */
export function MobileMenu({ open, onClose, searchValue = '' }) {
  // Stop the page behind the drawer from scrolling on touch devices.
  useLockBodyScroll(open);

  useOnEscape(onClose, open);

  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useFocusTrap(open, panelRef, { initialFocusRef: closeRef });

  if (!open) return null;

  return (
    <>
      <div className="navbar__scrim" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className="mobile-menu"
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
      >
        <div className="cluster cluster--between">
          <span className="cluster gap-2 font-bold">
            <LogoIcon width="22" height="22" style={{ color: 'var(--accent-soft)' }} />
            Recipe Discovery
          </span>

          <button
            ref={closeRef}
            type="button"
            className="navbar__toggle"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon className="navbar__toggle-icon" />
          </button>
        </div>

        <div className="mobile-menu__divider" />

        <div className="mobile-menu__search">
          <SearchBar value={searchValue} />
        </div>

        <nav aria-label="Main">
          <ul className="mobile-menu__links">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `mobile-menu__link${isActive ? 'is-active' : ''}`
                    }
                    onClick={onClose}
                  >
                    <Icon className="mobile-menu__link-icon" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mobile-menu__footer">
          <p>Recipes and images provided by TheMealDB.</p>
        </div>
      </div>
    </>
  );
}

export default MobileMenu;