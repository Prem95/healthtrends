import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradient, radius, space, type } from '@/theme/tokens';

/*
  The handful of building blocks every screen is made of. Keeping them here,
  and small, is what keeps the app looking like one product.
*/

/** A scrolling screen on the paper canvas, warmed at the top by the brand wash. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 96 };
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['rgba(28,140,116,0.14)', 'rgba(238,116,32,0.10)', 'rgba(245,244,239,0)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.screenWash}
        pointerEvents="none"
      />
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[styles.content, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, padding, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

/** White card on a hairline. `wash` adds the faint green/orange corners. */
export function Card({
  children,
  wash = false,
  style,
}: {
  children: ReactNode;
  wash?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      {wash && (
        <LinearGradient
          colors={gradient.wash}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'light' | 'glass' | 'ghost' | 'danger';

/** Pill button, 50pt tall (≥44pt target). One primary per screen. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  onPress,
  style,
  ...rest
}: {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'style' | 'children'>) {
  const v = VARIANT[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        v.container,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.label.color as string} />
      ) : (
        <Text style={[styles.buttonLabel, v.label]} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const VARIANT: Record<ButtonVariant, { container: ViewStyle; label: { color: string } }> = {
  primary: { container: { backgroundColor: colors.ink }, label: { color: colors.page } },
  secondary: {
    container: { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
    label: { color: colors.ink },
  },
  light: { container: { backgroundColor: colors.white }, label: { color: colors.ink } },
  glass: {
    container: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
    label: { color: colors.white },
  },
  ghost: { container: { backgroundColor: 'transparent' }, label: { color: colors.brand } },
  danger: {
    container: { backgroundColor: colors.paper, borderWidth: 1, borderColor: 'rgba(209,52,91,0.4)' },
    label: { color: '#AD2247' },
  },
};

/** Small uppercase kicker above a heading. */
export function Eyebrow({ children, color = colors.ink3 }: { children: string; color?: string }) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function SectionTitle({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText} accessibilityRole="header">
        {title}
        {count != null && <Text style={{ color: colors.ink3, fontWeight: '400' }}>{`  ${count}`}</Text>}
      </Text>
      {action}
    </View>
  );
}

/** Loading, error and empty in one place so every screen handles all three. */
export function QueryState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink3} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[type.callout, { color: colors.ink2, textAlign: 'center' }]}>
          We could not load this just now. Check your connection and try again.
        </Text>
        {onRetry && <Button label="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: space.lg }} />}
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  screenWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  content: { paddingHorizontal: space.lg, gap: space.xxl },
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    padding: space.xl,
    overflow: 'hidden',
  },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { ...type.headline },
  eyebrow: {
    fontFamily: 'ui-monospace',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.md },
  sectionTitleText: { ...type.headline, color: colors.ink },
  center: { paddingVertical: space.xxxl, alignItems: 'center', justifyContent: 'center' },
});
