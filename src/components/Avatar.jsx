import { useState } from 'react';

/**
 * User avatar: the profile picture when there is one, otherwise the person's
 * initials on the accent gradient.
 *
 * A failed image request (a revoked OAuth picture URL, say) falls back to the
 * initials rather than showing a broken-image icon.
 *
 * Size is chosen by the caller through `className` (`avatar--sm`,
 * `avatar--lg`, …) so every class name in use is written out in the JSX.
 *
 * @param {{src?: string|null, name?: string|null, className?: string}} props
 */
export function Avatar({ src = null, name = '', className = '' }) {
  const [failed, setFailed] = useState(false);

  const initials = String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span className={`avatar ${className}`.trim()} aria-hidden="true">
      {src && !failed ? (
        <img className="avatar__image" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar__initials">{initials || 'RL'}</span>
      )}
    </span>
  );
}

export default Avatar;
