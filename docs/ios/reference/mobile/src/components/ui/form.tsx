import DateTimePicker from '@react-native-community/datetimepicker';
import type { Sex } from '@domain';
import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { fromISODate, todayISO, toISODate } from '@/lib/format';
import { colors, radius, space, type } from '@/theme/tokens';

/*
  Form building blocks shared by Add results, Timeline, marker detail and
  Settings. Native controls where iOS has one (the date picker, the keyboard),
  the app's pill shapes everywhere else.
*/

export const SEXES: { value: Sex; label: string }[] = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
  { value: 'OTHER', label: 'Prefer not to say' },
];

export const SEX_LABEL: Record<Sex, string> = { F: 'Female', M: 'Male', OTHER: 'Prefer not to say' };

/** A labelled text input. */
export function TextField({
  label,
  inputRef,
  style,
  ...input
}: { label: string; inputRef?: Ref<TextInputInstance>; style?: StyleProp<ViewStyle> } & TextInputProps) {
  return (
    <View style={[{ gap: space.xs }, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        placeholderTextColor={colors.ink3}
        accessibilityLabel={label}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

/** One choice among a few: pill options in a row that wraps. */
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: space.xs }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <Text style={[styles.choiceLabel, on && { color: colors.page }]} maxFontSizeMultiplier={1.3}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A segmented control (scope, time window). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            hitSlop={4}
            style={[styles.segItem, on && styles.segItemOn]}
          >
            <Text style={[styles.segLabel, on && { color: colors.ink }]} maxFontSizeMultiplier={1.3}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A calendar date ("2026-01-15") with the native compact picker. Never in the future. */
export function DateField({
  label,
  value,
  onChange,
  allowFuture = false,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  allowFuture?: boolean;
}) {
  return (
    <View style={styles.dateRow}>
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
      <DateTimePicker
        value={fromISODate(value)}
        mode="date"
        display="compact"
        maximumDate={allowFuture ? undefined : fromISODate(todayISO())}
        accentColor={colors.brand}
        themeVariant="light"
        onValueChange={(_, date) => onChange(toISODate(date))}
        accessibilityLabel={label}
      />
    </View>
  );
}

/**
 * A page sheet with a Cancel / title / primary action bar, used for the
 * small forms (life event, own range, profile, custom marker).
 */
export function Sheet({
  visible,
  title,
  onClose,
  action,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  action?: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.sheet}>
        <View style={styles.sheetBar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" style={styles.sheetSide}>
            <Text style={styles.sheetCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTitle} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.sheetSide, { alignItems: 'flex-end' }]}>
            {action && (
              <Pressable
                onPress={action.onPress}
                disabled={action.disabled || action.loading}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!action.disabled, busy: !!action.loading }}
              >
                <Text style={[styles.sheetAction, (action.disabled || action.loading) && { opacity: 0.4 }]}>
                  {action.loading ? 'Saving…' : action.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A line of error copy under a form. */
export function FormError({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

export const formStyles = StyleSheet.create({
  input: {
    ...type.body,
    lineHeight: undefined,
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    color: colors.ink,
  },
});

const styles = StyleSheet.create({
  label: { ...type.footnote, fontWeight: '500', color: colors.ink2 },
  input: formStyles.input,
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
  },
  choiceOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  choiceLabel: { ...type.subhead, fontWeight: '500', color: colors.ink2 },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    padding: 3,
    backgroundColor: colors.paper2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  segItem: { paddingHorizontal: 14, minHeight: 36, borderRadius: radius.pill, justifyContent: 'center' },
  segItemOn: { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  segLabel: { fontSize: 13, fontWeight: '500', color: colors.ink3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: space.md },
  sheet: { flex: 1, backgroundColor: colors.page },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: space.sm,
  },
  sheetSide: { width: 84 },
  sheetTitle: { ...type.headline, color: colors.ink, flex: 1, textAlign: 'center' },
  sheetCancel: { ...type.body, color: colors.ink2 },
  sheetAction: { ...type.headline, color: colors.brand },
  sheetBody: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  error: { ...type.footnote, color: '#AD2247' },
});
