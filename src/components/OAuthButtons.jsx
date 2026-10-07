import React from 'react';

import { FaFacebook } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

/**
 * "Continue with Google" and "Continue with Facebook".
 *
 * Shared by the sign-in and registration screens so the two always render the
 * same brand marks, the same "Connecting to..." state and the same layout.
 * The icon sits in a fixed column on the left, the label is centred in the
 * middle, and a third empty column keeps it centred.
 */
export function OAuthButtons({ onSelect, pendingProvider = null, disabled = false }) {
  const providers = [
    { id: 'google', name: 'Google', Icon: FcGoogle },
    { id: 'facebook', name: 'Facebook', Icon: FaFacebook },
  ];

  const anyPending = Boolean(pendingProvider);

  return (
    <div className="auth__providers">
      {providers.map(({ id, name, Icon }) => {
        const isPending = pendingProvider === id;
        const label = isPending ? `Connecting to ${name}...` : `Continue with ${name}`;

        return (
          <button
            key={id}
            type="button"
            className={`btn btn--secondary btn--lg btn--block oauth-btn oauth-btn--${id}`}
            onClick={() => {
              if (disabled || anyPending) return;
              onSelect(id);
            }}
            disabled={disabled || anyPending}
            aria-label={label}
            aria-busy={isPending ? true : undefined}
          >
            <span className="oauth-btn__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="oauth-btn__label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default OAuthButtons;
