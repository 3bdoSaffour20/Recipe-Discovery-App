import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { logo } from '../assets/media';
import { navItems } from '../data/navigation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Avatar } from './Avatar';
import { MenuIcon } from './Icons';
import { MobileMenu } from './MobileMenu';
import { Picture } from './Picture';
import { SearchBar } from './SearchBar';

/** Matches the CSS breakpoint where the desktop navigation takes over. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Sticky application header.
 *
 * Desktop: brand on the left, links in the middle, search on the right.
 * Below 1024px the links and search are replaced by a hamburger that opens
 * `MobileMenu`.
 */
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toggleRef = useRef(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const { isAuthenticated, user, profile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Recipe lover';
  const firstName = displayName.split(' ')[0];

  async function handleLogout() {
    try {
      await logout();
      toast.success('You have been signed out.');
      navigate('/');
    } catch (caught) {
      toast.error(caught?.message || 'You could not be signed out.');
    }
  }

  // The drawer is irrelevant once the desktop layout takes over, so closing it
  // here avoids it lingering invisibly over the page.
  useEffect(() => {
    if (isDesktop) setMenuOpen(false);
  }, [isDesktop]);

  // Any navigation closes the drawer. Focus is not touched here: the effect
  // below decides where it goes, and only when the drawer actually had it.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  // When the drawer closes, focus returns to the button that opened it, so
  // the next Tab press does not jump back into the page behind it. Guarding on
  // the previous state matters: focusing unconditionally would steal focus on
  // the very first render, which on a phone would jump past the skip link and
  // the brand link.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !menuOpen) {
      toggleRef.current?.focus();
    }
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  // Keep the header search in step with the URL: arriving at /search via the
  // header shows the current query, and going back restores the previous one.
  const queryParam = searchParams.get('query') ?? '';
  const headerValue = location.pathname === '/search' ? queryParam : '';

  return (
    <>
      <header className="navbar">
        <nav className="container navbar__inner" aria-label="Main navigation">
          <Link to="/" className="navbar__brand" aria-label="Recipe Discovery — home">
            <Picture
              className="navbar__logo"
              src={logo.src}
              srcSet={logo.srcSet}
              sizes="48px"
              alt=""
              width="48"
              height="48"
              eager
            />
            <span className="navbar__brand-text">
              <span className="navbar__title">Recipe Discovery</span>
              <span className="navbar__tagline">
                Find delicious recipes from around the world
              </span>
            </span>
          </Link>

          <div className="navbar__desktop">
            <ul className="navbar__links">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `navbar__link${isActive ? ' is-active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="navbar__search">
              <SearchBar value={headerValue} />
            </div>

            {/*
              The account cluster. Signed out it is one button; signed in it
              shows who is in, with the avatar linking to the profile page and
              a separate sign-out control so the two never share a target.
            */}
            <div className="navbar__auth">
              {isAuthenticated ? (
                <>
                  <Link className="navbar__account" to="/profile" title={displayName}>
                    <Avatar
                      src={profile?.avatar_url}
                      name={displayName}
                      className="avatar--sm"
                    />
                    <span className="navbar__account-name">{firstName}</span>
                  </Link>

                  <button
                    type="button"
                    className="btn btn--ghost navbar__logout"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link className="btn btn--primary navbar__login" to="/login">
                  Log in
                </Link>
              )}
            </div>
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="navbar__toggle"
            // `expanded` + `controls` tell assistive tech what the button does.
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon className="navbar__toggle-icon" />
          </button>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} searchValue={headerValue} />
    </>
  );
}

export default Navbar;