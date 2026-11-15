import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art, Glass } from '@/components/ui/art';
import { Button, Eyebrow } from '@/components/ui/primitives';
import { PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { NOTICE_COPY, PRODUCT_IDS, usePurchases } from '@/lib/purchases';
import { useEntitlement } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

const FEATURES = [
  'Up to 6 profiles, for the people you look after',
  'Unlimited tests',
  'A one-page summary to print or send to your doctor',
];

/*
  The Pro sheet. Everything App Review requires of a subscription screen is
  here in plain sight: what you get, the price and period of each plan as the
  App Store reports them, that it renews until cancelled, restore, and links
  to the terms and the privacy policy.
*/
export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { products, ready, busy, notice, buy, restore, clearNotice } = usePurchases();
  const entitlement = useEntitlement();
  const [selected, setSelected] = useState<string>(PRODUCT_IDS.yearly);

  const isPro = entitlement.data?.plan === 'pro';
  const viaWeb = entitlement.data?.source === 'stripe';

  return (
    <Art name="deep" style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, gap: space.xl }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12} style={styles.close}>
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>

        <Eyebrow color="rgba(255,255,255,0.7)">bbiom Pro</Eyebrow>
        <Text style={styles.title} accessibilityRole="header">
          For the appointment, and for the people you look after.
        </Text>

        <Glass style={{ gap: space.md }}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.feature}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          <Text style={styles.small}>Tracking, trends, ranges and export stay free.</Text>
        </Glass>

        {isPro ? (
          <Glass>
            <Text style={styles.featureText}>
              {viaWeb
                ? 'You are on Pro through the bbiom website. Manage it there, under Settings.'
                : 'You are on Pro. Manage or cancel it in your App Store subscriptions.'}
            </Text>
          </Glass>
        ) : (
          <>
            <View style={{ gap: space.md }} accessibilityRole="radiogroup">
              {products.map((p) => {
                const on = selected === p.id;
                const yearly = p.id === PRODUCT_IDS.yearly;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSelected(p.id)}
                    style={[styles.plan, on && styles.planOn]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planName}>{yearly ? 'Yearly' : 'Monthly'}</Text>
                      <Text style={styles.planSub}>{yearly ? 'Billed once a year' : 'Billed every month'}</Text>
                    </View>
                    <Text style={styles.planPrice}>{`${p.displayPrice} / ${yearly ? 'year' : 'month'}`}</Text>
                  </Pressable>
                );
              })}
              {products.length === 0 && (
                <Text style={styles.small}>
                  {ready ? 'Plans are not available right now. Please try again shortly.' : 'Loading plans…'}
                </Text>
              )}
            </View>

            <Button
              label="Subscribe"
              variant="light"
              loading={busy}
              disabled={products.length === 0}
              onPress={() => buy(selected)}
            />
            <Text style={styles.small}>
              Payment is charged to your Apple Account. The subscription renews automatically at the price
              shown until you cancel, which you can do at any time in your App Store account settings, at
              least 24 hours before the end of the current period.
            </Text>
          </>
        )}

        {notice && (
          <Pressable onPress={clearNotice} accessibilityLiveRegion="polite">
            <Glass>
              <Text style={styles.featureText}>{NOTICE_COPY[notice]}</Text>
            </Glass>
          </Pressable>
        )}

        <View style={styles.links}>
          <Pressable onPress={restore} hitSlop={10} accessibilityRole="button">
            <Text style={styles.link}>Restore purchases</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={10} accessibilityRole="link">
            <Text style={styles.link}>Terms of use</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={10} accessibilityRole="link">
            <Text style={styles.link}>Privacy policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Art>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderRadius: 0 },
  close: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  closeLabel: { ...type.headline, color: colors.white },
  title: { ...type.title1, color: colors.white },
  feature: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  check: { ...type.headline, color: colors.brand },
  featureText: { ...type.callout, color: colors.ink, flex: 1 },
  small: { ...type.caption, color: 'rgba(255,255,255,0.8)' },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 68,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(8,30,26,0.45)',
  },
  planOn: { borderColor: colors.white, backgroundColor: 'rgba(8,30,26,0.7)' },
  planName: { ...type.headline, color: colors.white },
  planSub: { ...type.caption, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  planPrice: { ...type.headline, color: colors.white, fontVariant: ['tabular-nums'] },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space.xl, rowGap: space.md },
  link: { ...type.footnote, color: colors.white, textDecorationLine: 'underline' },
});
