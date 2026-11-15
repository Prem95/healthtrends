import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearPersistedCache, queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

/*
  Authentication. Three ways in, all ending in the same Supabase session:
    - Sign in with Apple (native sheet; required because Google is offered)
    - a six-digit code sent by email (no deep link to go wrong)
    - Google, through the system browser sheet (for people who started on the web)
*/

type AuthState = {
  session: Session | null;
  /** True until the stored session has been read from the Keychain. */
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, loading: false });
      if (event === 'SIGNED_OUT') {
        // Nothing of the previous person's data may outlive their session.
        queryClient.clear();
        clearPersistedCache();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}

export class AuthCancelled extends Error {}

/** Native Sign in with Apple → Supabase session. */
export async function signInWithApple(): Promise<void> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelled();
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

/** Step 1 of email sign-in: send a six-digit code. Creates the account if new. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Step 2: exchange the code for a session. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
}

/** Google in the system browser sheet (PKCE). */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new AuthCancelled();

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not complete.');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export async function signOut(): Promise<void> {
  // 'local' ends this device's session only; other devices stay signed in.
  await supabase.auth.signOut({ scope: 'local' });
}

/**
 * Deletes the account and everything in it. For Apple users a fresh
 * authorization code lets the server revoke the Sign in with Apple grant too.
 */
export async function deleteAccount(): Promise<{ appStoreSubscriptionActive: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  const usesApple = userData.user?.app_metadata?.providers?.includes('apple') ?? false;

  let appleAuthorizationCode: string | undefined;
  if (usesApple) {
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      appleAuthorizationCode = credential.authorizationCode ?? undefined;
    } catch {
      // Cancelled: the account is still deleted, the Apple grant stays until
      // the user removes it in Settings > Apple Account > Sign in with Apple.
    }
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: 'DELETE', appleAuthorizationCode },
  });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
  return { appStoreSubscriptionActive: !!data?.appStoreSubscriptionActive };
}
