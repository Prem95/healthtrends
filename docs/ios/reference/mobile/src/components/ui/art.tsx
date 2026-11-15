import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

/*
  The painted green-to-orange artwork (same files as the web's public/art) and
  the frosted glass that product UI sits on when it floats over it.
*/

const ART = {
  hero: require('@/assets/art/hero.webp'),
  wide: require('@/assets/art/wide.webp'),
  deep: require('@/assets/art/deep.webp'),
  step1: require('@/assets/art/step1.webp'),
  step2: require('@/assets/art/step2.webp'),
  step3: require('@/assets/art/step3.webp'),
  cta: require('@/assets/art/cta.webp'),
} as const;

export type ArtName = keyof typeof ART;

/** A rounded panel filled with a painting. Decorative: hidden from VoiceOver. */
export function Art({
  name,
  flip = false,
  scrim = false,
  style,
  children,
}: {
  name: ArtName;
  /** Turn the painting upside down to put its green under white type. */
  flip?: boolean;
  /** Darken for white type set directly on the art. */
  scrim?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.art, style]}>
      <Image
        source={ART[name]}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, flip && { transform: [{ rotate: '180deg' }] }]}
        accessible={false}
        transition={150}
      />
      {scrim && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} />}
      {children}
    </View>
  );
}

/**
 * Frosted surface for content on artwork. Real Liquid Glass on iOS 26+, a
 * system blur on earlier versions; both carry ink text.
 */
export function Glass({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={[styles.glass, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView intensity={60} tint="light" style={[styles.glass, styles.glassFallback, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  art: { borderRadius: radius.panel, overflow: 'hidden', backgroundColor: '#0C5348' },
  glass: { borderRadius: radius.card, overflow: 'hidden', padding: 16 },
  glassFallback: { backgroundColor: 'rgba(255,255,255,0.72)' },
});
