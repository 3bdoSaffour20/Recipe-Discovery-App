import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { isSupabaseConfigured, logSupabaseDiagnostics, supabase } from '../services/supabase';

const AuthContext = createContext(null);

/**
 * Global authentication state.
 *
 * Supabase is the single owner of the session: it persists the token, refreshes
 * it before it expires and restores it when the page is reloaded, so a user
 * stays signed in without this app storing a credential anywhere.
 * `onAuthStateChange` mirrors every event — sign-in, sign-out, token refresh
 * and recovery — into React state.
 *
 * `loading` stays true until `getSession()` has answered, which is what stops
 * any screen from concluding "signed out" during the moment an OAuth return is
 * still being settled.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Guards against loading a profile twice for the same user, and against a
  // late response overwriting the state of a user who signed out meanwhile.
  const profileKeyRef = useRef(null);

  const applySession = useCallback((nextSession) => {
    setSession(nextSession ?? null);
    setUser(nextSession?.user ?? null);
  }, []);

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      profileKeyRef.current = null;
      setProfile(null);
      return;
    }
    if (profileKeyRef.current === nextUser.id) return;

    profileKeyRef.current = nextUser.id;
    // `ensureProfile` writes/refreshes the row; `getProfile` is the fallback
    // when that write is rejected (table missing, offline, and so on).
    const ensured = await authService.ensureProfile(nextUser);
    const fetched = ensured ?? (await authService.getProfile(nextUser.id));

    if (profileKeyRef.current === nextUser.id) setProfile(fetched);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        applySession(data.session);
        if (data.session?.user) loadProfile(data.session.user);
      })
      .catch(() => {
        // A corrupt stored session just means "signed out".
        if (active) applySession(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      applySession(nextSession);

      if (nextSession?.user) {
        // Supabase holds an auth lock while this callback runs, so any other
        // request from inside it would deadlock. Defer instead.
        window.setTimeout(() => loadProfile(nextSession.user), 0);
      } else if (event === 'SIGNED_OUT') {
        profileKeyRef.current = null;
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession, loadProfile]);

  // Development only: logs whether the keys and the session exist — never the
  // values, never a token, and never outside `npm run dev`.
  useEffect(() => {
    logSupabaseDiagnostics(session);
  }, [session]);

  const login = useCallback(
    async ({ email, password }) => {
      const nextSession = await authService.signInWithEmail({ email, password });
      applySession(nextSession);
      if (nextSession?.user) await loadProfile(nextSession.user);
      return nextSession;
    },
    [applySession, loadProfile],
  );

  const register = useCallback(
    async ({ fullName, email, password }) => {
      const result = await authService.signUpWithEmail({ fullName, email, password });

      if (result.session) {
        applySession(result.session);
        if (result.session.user) await loadProfile(result.session.user);
      }

      return result;
    },
    [applySession, loadProfile],
  );

  const loginWithGoogle = useCallback(
    ({ from = '/' } = {}) => authService.signInWithOAuth('google', { from }),
    [],
  );

  const loginWithFacebook = useCallback(
    ({ from = '/' } = {}) => authService.signInWithOAuth('facebook', { from }),
    [],
  );

  const logout = useCallback(async () => {
    await authService.signOut();
    applySession(null);
    profileKeyRef.current = null;
    setProfile(null);
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    profileKeyRef.current = null;
    await loadProfile(user);
    return null;
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      isAuthenticated: Boolean(user),
      isConfigured: isSupabaseConfigured,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the auth context.
 * @throws if used outside an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}

export default AuthProvider;
