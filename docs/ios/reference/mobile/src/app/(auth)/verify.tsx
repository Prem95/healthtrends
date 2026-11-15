import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button, Eyebrow, Screen } from '@/components/ui/primitives';
import { sendEmailCode, verifyEmailCode } from '@/lib/auth';
import { colors, radius, space, type } from '@/theme/tokens';

/* Step two of email sign-in: the six-digit code. iOS offers it from Mail. */
export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function submit(value: string) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email, value);
      // The root layout moves to the app as soon as the session exists.
    } catch {
      setError('That code is not right, or it has expired. Check the latest email, or send a new code.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ gap: space.lg, paddingTop: space.xxxl }}>
      <Eyebrow>Check your email</Eyebrow>
      <Text style={styles.title} accessibilityRole="header">
        Enter the six-digit code
      </Text>
      <Text style={styles.body}>
        We sent it to <Text style={{ color: colors.ink, fontWeight: '500' }}>{email}</Text>. It expires in an hour.
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          submit(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        accessibilityLabel="Six-digit code"
        style={styles.code}
      />
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <Button label="Continue" loading={busy} disabled={code.length !== 6} onPress={() => submit(code)} />
      <Button
        label={resent ? 'New code sent' : 'Send a new code'}
        variant="ghost"
        disabled={resent}
        onPress={async () => {
          try {
            await sendEmailCode(email);
            setResent(true);
          } catch {
            setError('We could not send a new code yet. Wait a minute and try again.');
          }
        }}
      />
      <Button label="Use a different email" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title1, color: colors.ink },
  body: { ...type.body, color: colors.ink2 },
  code: {
    fontSize: 32,
    fontWeight: '500',
    letterSpacing: 10,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    minHeight: 64,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    color: colors.ink,
  },
  error: { ...type.footnote, color: '#AD2247' },
});
