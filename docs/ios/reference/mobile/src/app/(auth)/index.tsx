import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from '@/components/ui/art';
import { Button, Eyebrow } from '@/components/ui/primitives';
import { AuthCancelled, sendEmailCode, signInWithApple, signInWithGoogle } from '@/lib/auth';
import { colors, radius, space, type } from '@/theme/tokens';

/*
  Sign in / sign up (one screen: the same actions create an account).
  Order follows what people on an iPhone reach for: Apple first, then the
  email code, then Google for people who started on the web.
*/
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'apple' | 'email' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'apple' | 'email' | 'google', fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof AuthCancelled)) {
        setError(
          kind === 'email'
            ? 'We could not send a code to that address. Check it and try again.'
            : 'Sign-in did not complete. Please try again.',
        );
      }
    } finally {
      setBusy(null);
    }
  }

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <Art name="hero" flip scrim style={[styles.art, { paddingTop: insets.top + space.xl }]}>
        <Eyebrow color="rgba(255,255,255,0.75)">Blood test tracker</Eyebrow>
        <Text style={styles.headline} accessibilityRole="header">
          Every blood test you’ve had, on one clear timeline.
        </Text>
      </Art>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={25}
          style={styles.apple}
          onPress={() => run('apple', signInWithApple)}
        />

        <View style={styles.or}>
          <View style={styles.rule} />
          <Text style={styles.orText}>or use your email</Text>
          <View style={styles.rule} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          accessibilityLabel="Email address"
          style={styles.input}
          onSubmitEditing={() =>
            emailOk &&
            run('email', async () => {
              await sendEmailCode(email);
              router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
            })
          }
        />
        <Button
          label="Email me a code"
          variant="secondary"
          loading={busy === 'email'}
          disabled={!emailOk || busy != null}
          onPress={() =>
            run('email', async () => {
              await sendEmailCode(email);
              router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
            })
          }
        />
        <Button
          label="Continue with Google"
          variant="ghost"
          loading={busy === 'google'}
          disabled={busy != null}
          onPress={() => run('google', signInWithGoogle)}
        />

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Text style={styles.legal}>
          bbiom tracks values you enter and does not provide medical advice. Discuss results with your
          healthcare provider.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  art: { flex: 1, margin: space.sm, padding: space.xl, justifyContent: 'flex-end', gap: space.md },
  headline: { ...type.largeTitle, color: colors.white },
  sheet: { paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.md },
  apple: { height: 50, width: '100%' },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xs },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  orText: { ...type.caption, color: colors.ink3 },
  input: {
    ...type.body,
    lineHeight: undefined,
    minHeight: 50,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    paddingHorizontal: space.lg,
    color: colors.ink,
  },
  error: { ...type.footnote, color: '#AD2247', textAlign: 'center' },
  legal: { ...type.caption, color: colors.ink3, textAlign: 'center', marginTop: space.xs },
});
