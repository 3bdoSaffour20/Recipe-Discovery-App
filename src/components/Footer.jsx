import { Link, NavLink } from 'react-router-dom';
import { logo } from '../assets/media';
import { quickLinks, recipeLinks, socialLinks } from '../data/navigation';
import {
  BookOpenIcon,
  FacebookIcon,
  GridIcon,
  HomeIcon,
  InstagramIcon,
  LogoIcon,
  PinterestIcon,
  SearchIcon,
  ShuffleIcon,
  XIcon,
} from './Icons';
import { Picture } from './Picture';

/** Footer navigation column. */
function FooterColumn({ heading, links }) {
  return (
    <div>
      <h2 className="footer__heading">{heading}</h2>
      <ul className="footer__list">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <li key={link.label}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `footer__link${isActive ? ' is-active' : ''}`
                }
              >
                {Icon ? <Icon className="footer__link-icon" /> : null}
                {link.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Site footer.
 *
 * The grid is one column on phones and becomes four on desktop, so nothing
 * ever needs to scroll sideways. Social links point at the project's own
 * pages/resources rather than dead `href="#"` placeholders.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Link to="/" className="footer__brand-link" aria-label="Recipe Discovery — home">
              <Picture
                className="footer__logo"
                src={logo.src}
                srcSet={logo.srcSet}
                sizes="44px"
                alt=""
                width="44"
                height="44"
              />
              <span className="footer__brand-name">Recipe Discovery</span>
            </Link>

            <p className="footer__about">
              Find delicious recipes from around the world and discover your next
              favourite meal from our curated collection.
            </p>

            <ul className="footer__socials">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <li key={social.label}>
                    <a
                      className="footer__social"
                      href={social.href}
                      // These are outbound links, so they open in a new tab and
                      // must not leak the opener reference or referrer.
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={social.label}
                    >
                      <Icon className="footer__social-icon" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <FooterColumn heading="Quick Links" links={quickLinks} />
          <FooterColumn heading="Recipe Links" links={recipeLinks} />

          <div>
            <h2 className="footer__heading">Contact Us</h2>
            <p className="footer__about mb-4">
              Have a recipe to share? Reach out to us.
            </p>
            <a className="link-button" href="mailto:contact@recipediscovery.com">
              contact@recipediscovery.com
            </a>

            <p className="footer__about mt-6 text-sm">
              <LogoIcon
                width="16"
                height="16"
                style={{ display: 'inline', verticalAlign: '-2px' }}
              />{' '}
              Recipe data and photography provided by{' '}
              <a
                className="text-accent"
                href="https://www.themealdb.com"
                target="_blank"
                rel="noreferrer noopener"
              >
                TheMealDB
              </a>
            </p>
          </div>
        </div>

        <div className="footer__bottom">
          <p>
            &copy; {year} Recipe Discovery. All rights reserved.
          </p>
          <p className="footer__credit">
            <Link to="/about" className="link-button">
              About this project
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;