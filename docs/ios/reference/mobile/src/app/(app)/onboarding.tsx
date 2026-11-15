import type { Sex } from '@domain';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Eyebrow, Screen } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { useCreateProfile } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

const SEXES: { value: Sex; label: string }[] = [
  { value: 'F', label: 'Female' },
  { value: 'M', label: 'Male' },
  { value: 'OTHER', label: 'Prefer not to say' },
];

/* The one question before the app: whose results are these? */
export default function Onboarding() {
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('OTHER');
  const create = useCreateProfile();

  return (
    <Screen contentStyle={{ gap: space.lg, paddingTop: space.xxxl }}>
      <Eyebrow>One quick step</Eyebrow>
      <Text style={styles.title} accessibilityRole="header">
        Who are these results for?
      </Text>
      <Text style={styles.body}>
        Sex lets bbiom pick the right standard range where it differs. You can change both later.
      </Text>

      <Text style={styles.label}>Profile name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Me"
        placeholderTextColor={colors.ink3}
        maxLength={80}
        autoFocus
        returnKeyType="done"
        accessibilityLabel="Profile name"
        style={styles.input}
      />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {SEXES.map((s) => {
          const on = sex === s.value;
          return (
            <Pressable
              key={s.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setSex(s.value)}
              style={[styles.option, on && styles.optionOn]}
            >
              <Text style={[styles.optionLabel, on && { color: colors.page }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {create.isError && (
        <Text style={styles.error}>
          {create.error instanceof ApiError && create.error.code === 'profile_limit'
            ? 'This plan already has its profile.'
            : 'That did not save. Check your connection and try again.'}
        </Text>
      )}
      <Button
        label="Continue"
        loading={create.isPending}
        disabled={name.trim().length === 0}
        onPress={() => create.mutate({ name, sex })}
        style={{ marginTop: space.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title1, color: colors.ink },
  body: { ...type.body, color: colors.ink2 },
  label: { ...type.footnote, fontWeight: '500', color: colors.ink2, marginBottom: -space.sm },
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
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionLabel: { ...type.subhead, fontWeight: '500', color: colors.ink2 },
  error: { ...type.footnote, color: '#AD2247' },
});
