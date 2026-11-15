import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { CustomMarkersSection, ProfilesSection, SummaryRow } from '@/components/settings/settings-sections';
import { Button, Card, Screen, SectionTitle } from '@/components/ui/primitives';
import { useAppLock } from '@/lib/app-lock';
import { deleteAccount, signOut, useAuth } from '@/lib/auth';
import { exportData } from '@/lib/export';
import { formatDate } from '@/lib/format';
import { PRIVACY_URL, SUPPORT_URL, TERMS_URL } from '@/lib/links';
import { usePurchases } from '@/lib/purchases';
import { useEntitlement } from '@/lib/queries';
import { DISCLAIMER } from '@/lib/summary';
import { colors, space, type } from '@/theme/tokens';

/*
  Settings: account, plan, profiles, your own markers, privacy, your data. The two things App Review looks
  for are both here and both free: a full export, and deleting the account
  from inside the app.
*/
export default function Settings() {
  const { session } = useAuth();
  const entitlement = useEntitlement();
  const lock = useAppLock();
  const { manage } = usePurchases();
  const [working, setWorking] = useState<'json' | 'csv' | 'delete' | null>(null);

  const e = entitlement.data;
  const isPro = e?.plan === 'pro';

  async function runExport(format: 'json' | 'csv') {
    setWorking(format);
    try {
      await exportData(format);
    } catch {
      Alert.alert('Export failed', 'Check your connection and try again.');
    } finally {
      setWorking(null);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes every profile, test, result and note, and your sign-in. There is no undo. Export your data first if you want a copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setWorking('delete');
            try {
              const { appStoreSubscriptionActive } = await deleteAccount();
              if (appStoreSubscriptionActive) {
                Alert.alert(
                  'One more step',
                  'Your account is deleted. Your App Store subscription is billed by Apple and is still active: cancel it in Settings › Apple Account › Subscriptions.',
                );
              }
            } catch {
              Alert.alert('Could not delete the account', 'Nothing was removed. Please try again.');
            } finally {
              setWorking(null);
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>
        <Text style={styles.subtitle}>{session?.user.email ?? 'Signed in with Apple'}</Text>
      </View>

      <View>
        <SectionTitle title="Plan" />
        <Card wash style={{ gap: space.md }}>
          <Text style={styles.cardTitle}>{isPro ? 'Pro' : 'Free'}</Text>
          <Text style={styles.cardBody}>
            {isPro
              ? `Up to 6 profiles, unlimited tests, doctor summary.${e?.expiresAt ? ` ${e.appStoreAutoRenew === false ? 'Ends' : 'Renews'} ${formatDate(e.expiresAt)}.` : ''}`
              : `1 profile · ${e?.sessionCount ?? 0} of ${e?.maxSessions ?? 20} tests used · export always included.`}
          </Text>
          {isPro && e?.source === 'app_store' && <Button label="Manage subscription" variant="secondary" onPress={manage} />}
          {isPro && e?.source === 'stripe' && (
            <Text style={styles.cardBody}>This subscription was bought on the website. Manage it at bbiom on the web.</Text>
          )}
          {!isPro && <Button label="See Pro" onPress={() => router.push('/paywall')} />}
        </Card>
      </View>

      <SummaryRow />
      <ProfilesSection />
      <CustomMarkersSection />

      <View>
        <SectionTitle title="Privacy" />
        <Card style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Require Face ID</Text>
            <Text style={styles.cardBody}>
              {lock.available
                ? 'Ask for Face ID, Touch ID or your passcode when bbiom has been closed for a minute.'
                : 'Set up Face ID, Touch ID or a passcode on this iPhone to use app lock.'}
            </Text>
          </View>
          <Switch
            value={lock.enabled === true}
            disabled={!lock.available || lock.enabled === null}
            onValueChange={(on) => {
              lock.setEnabled(on);
            }}
            accessibilityLabel="Require Face ID"
          />
        </Card>
      </View>

      <View>
        <SectionTitle title="Your data" />
        <Card style={{ gap: space.md }}>
          <Text style={styles.cardBody}>Export and deletion are free on every plan. Your health data is yours.</Text>
          <Button label="Export as CSV" variant="secondary" loading={working === 'csv'} onPress={() => runExport('csv')} />
          <Button label="Export as JSON" variant="secondary" loading={working === 'json'} onPress={() => runExport('json')} />
        </Card>
      </View>

      <View>
        <SectionTitle title="About" />
        <Card style={styles.linkCard}>
          {LINKS.map((link, i) => (
            <Pressable
              key={link.url}
              onPress={() => {
                WebBrowser.openBrowserAsync(link.url);
              }}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              style={({ pressed }) => [styles.linkRow, i > 0 && styles.linkDivider, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.linkText}>{link.label}</Text>
              <Text style={styles.linkChevron} aria-hidden>
                ›
              </Text>
            </Pressable>
          ))}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <Button label="Delete account" variant="danger" loading={working === 'delete'} onPress={confirmDelete} />
      </View>

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </Screen>
  );
}

const LINKS = [
  { label: 'Privacy policy', url: PRIVACY_URL },
  { label: 'Terms of use', url: TERMS_URL },
  { label: 'Help and support', url: SUPPORT_URL },
];

const styles = StyleSheet.create({
  title: { ...type.largeTitle, color: colors.ink },
  subtitle: { ...type.footnote, color: colors.ink3, marginTop: 2 },
  cardTitle: { ...type.headline, color: colors.ink },
  cardBody: { ...type.subhead, color: colors.ink2 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  linkCard: { paddingVertical: 0 },
  linkRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: space.md },
  linkDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  linkText: { ...type.body, color: colors.ink, flex: 1 },
  linkChevron: { ...type.body, color: colors.ink3 },
  disclaimer: { ...type.caption, color: colors.ink3 },
});
