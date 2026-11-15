import { CATEGORY_LABEL, CATEGORY_ORDER, parseDecimal, type BiomarkerCategory, type Profile, type Sex } from '@domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Choices, DateField, FormError, SEX_LABEL, SEXES, Sheet, TextField } from '@/components/ui/form';
import { Button, Card, SectionTitle } from '@/components/ui/primitives';
import * as api from '@/lib/api';
import { ApiError } from '@/lib/api';
import { formatDate, prettyUnit, todayISO } from '@/lib/format';
import { keys, useCatalog, useCreateProfile, useEntitlement, useProfiles } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

/*
  The three Settings sections that edit the record itself: the people on the
  account, the account's own markers, and the way to the doctor summary.
*/

// ------------------------------------------------------------- profiles

export function ProfilesSection() {
  const profiles = useProfiles();
  const entitlement = useEntitlement();
  const [editing, setEditing] = useState<Profile | 'new' | null>(null);

  const list = profiles.data ?? [];
  const e = entitlement.data;
  const canAdd = e ? list.length < e.maxProfiles : false;

  return (
    <View>
      <SectionTitle title="Profiles" count={list.length} />
      <Card style={{ padding: 0 }}>
        {list.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => setEditing(p)}
            accessibilityRole="button"
            accessibilityHint="Edit this profile"
            style={({ pressed }) => [styles.row, i < list.length - 1 && styles.divider, pressed && styles.pressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{p.name}</Text>
              <Text style={styles.rowSub}>
                {[SEX_LABEL[p.sex], p.dateOfBirth ? `born ${formatDate(p.dateOfBirth)}` : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.chevron} aria-hidden>
              ›
            </Text>
          </Pressable>
        ))}
      </Card>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {canAdd ? (
          <Button label="Add a family member" variant="secondary" onPress={() => setEditing('new')} />
        ) : e?.plan === 'pro' ? (
          <Text style={styles.note}>Pro includes up to six profiles.</Text>
        ) : (
          <>
            <Text style={styles.note}>The Free plan includes one profile. Pro adds up to six.</Text>
            <Button label="See Pro" variant="secondary" onPress={() => router.push('/paywall')} />
          </>
        )}
      </View>
      {editing && <ProfileSheet profile={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </View>
  );
}

function ProfileSheet({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(profile?.name ?? '');
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'OTHER');
  const [dob, setDob] = useState<string | null>(profile?.dateOfBirth ?? null);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateProfile();
  const update = useMutation({
    mutationFn: (input: { name: string; sex: Sex; dateOfBirth?: string }) => api.updateProfile(profile!.id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.profiles }),
  });
  const busy = create.isPending || update.isPending;

  function submit() {
    const input = { name, sex, dateOfBirth: dob ?? undefined };
    const onError = (err: Error) =>
      setError(
        err instanceof ApiError && err.code === 'profile_limit'
          ? 'This plan has no room for another profile.'
          : 'Not saved. Check your connection and try again.',
      );
    if (profile) update.mutate(input, { onSuccess: onClose, onError });
    else create.mutate(input, { onSuccess: onClose, onError });
  }

  return (
    <Sheet
      visible
      title={profile ? 'Edit profile' : 'New profile'}
      onClose={onClose}
      action={{ label: 'Save', onPress: submit, disabled: name.trim() === '', loading: busy }}
    >
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} placeholder="e.g. Mum" autoFocus={!profile} />
      <Choices label="Sex" options={SEXES} value={sex} onChange={setSex} />
      <Text style={styles.note}>Sex picks the right typical range where it differs.</Text>
      {dob ? (
        <View style={{ gap: space.xs }}>
          <DateField label="Date of birth" value={dob} onChange={setDob} />
          <Pressable onPress={() => setDob(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Remove date of birth</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setDob(todayISO())} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.link}>Add date of birth (optional)</Text>
        </Pressable>
      )}
      <FormError>{error}</FormError>
    </Sheet>
  );
}

// ------------------------------------------------------- custom markers

export function CustomMarkersSection() {
  const catalog = useCatalog();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const remove = useMutation({
    mutationFn: api.removeCustomBiomarker,
    onSuccess: (outcome) => {
      client.invalidateQueries({ queryKey: keys.catalog });
      if (outcome === 'archived') {
        Alert.alert(
          'Archived',
          'This marker has results, so it was archived rather than deleted. Its history stays on the Timeline and in exports.',
        );
      }
    },
    onError: () => Alert.alert('Not removed', 'Check your connection and try again.'),
  });

  const mine = (catalog.data ?? []).filter((b) => b.isCustom && !b.archived);

  function confirmRemove(b: api.CatalogBiomarker) {
    Alert.alert(`Remove ${b.name}?`, 'If it has results it is archived instead, so nothing recorded is lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(b.id) },
    ]);
  }

  return (
    <View>
      <SectionTitle title="Your own markers" count={mine.length} />
      {mine.length > 0 && (
        <Card style={{ padding: 0, marginBottom: space.md }}>
          {mine.map((b, i) => (
            <View key={b.id} style={[styles.row, i < mine.length - 1 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{b.name}</Text>
                <Text style={styles.rowSub}>{`${prettyUnit(b.canonicalUnit)} · ${CATEGORY_LABEL[b.category]}`}</Text>
              </View>
              <Pressable onPress={() => confirmRemove(b)} accessibilityRole="button" accessibilityLabel={`Remove ${b.name}`} hitSlop={10}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      <Text style={[styles.note, { marginBottom: space.sm }]}>
        For a test that is not in the catalog. It gets its own chart like any other marker.
      </Text>
      <Button label="New custom marker" variant="secondary" onPress={() => setAdding(true)} />
      {adding && <CustomMarkerSheet onClose={() => setAdding(false)} />}
    </View>
  );
}

function CustomMarkerSheet({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<BiomarkerCategory>('OTHER');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: api.createCustomBiomarker,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.catalog }),
  });

  function submit() {
    const lo = min.trim() === '' ? null : parseDecimal(min);
    const hi = max.trim() === '' ? null : parseDecimal(max);
    if ((min.trim() !== '' && lo == null) || (max.trim() !== '' && hi == null)) {
      setError('The range needs numbers, or leave it blank.');
      return;
    }
    if (lo != null && hi != null && lo > hi) {
      setError('The minimum must be less than or equal to the maximum.');
      return;
    }
    const range = lo == null && hi == null ? null : { ...(lo != null ? { min: lo } : {}), ...(hi != null ? { max: hi } : {}) };
    create.mutate(
      { name, unit, category, range },
      { onSuccess: onClose, onError: () => setError('Not saved. Check your connection and try again.') },
    );
  }

  return (
    <Sheet
      visible
      title="New custom marker"
      onClose={onClose}
      action={{
        label: 'Save',
        onPress: submit,
        disabled: name.trim() === '' || unit.trim() === '',
        loading: create.isPending,
      }}
    >
      <TextField label="Name" value={name} onChangeText={setName} maxLength={80} placeholder="e.g. Lipoprotein(a)" autoFocus />
      <TextField label="Unit" value={unit} onChangeText={setUnit} maxLength={32} placeholder="e.g. nmol/L" autoCapitalize="none" autoCorrect={false} />
      <Choices
        label="Body system"
        options={CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
        value={category}
        onChange={setCategory}
      />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <TextField label="Range minimum" value={min} onChangeText={setMin} keyboardType="decimal-pad" placeholder="optional" style={{ flex: 1 }} />
        <TextField label="Range maximum" value={max} onChangeText={setMax} keyboardType="decimal-pad" placeholder="optional" style={{ flex: 1 }} />
      </View>
      <FormError>{error}</FormError>
    </Sheet>
  );
}

// ------------------------------------------------------- doctor summary

export function SummaryRow() {
  const entitlement = useEntitlement();
  const isPro = entitlement.data?.plan === 'pro';
  return (
    <Pressable
      onPress={() => router.push(isPro ? '/summary' : '/paywall')}
      accessibilityRole="button"
      accessibilityLabel={isPro ? 'Doctor summary' : 'Doctor summary, a Pro feature'}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Card wash style={styles.summary}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Doctor summary</Text>
          <Text style={styles.rowSub}>One page for your next appointment, to share or print.</Text>
        </View>
        {isPro ? (
          <Text style={styles.chevron} aria-hidden>
            ›
          </Text>
        ) : (
          <View style={styles.proTag}>
            <Text style={styles.proText}>Pro</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: 14, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.paper2 },
  rowTitle: { ...type.headline, color: colors.ink },
  rowSub: { ...type.footnote, color: colors.ink3, marginTop: 2 },
  chevron: { ...type.title2, color: colors.ink3 },
  note: { ...type.footnote, color: colors.ink3 },
  link: { ...type.footnote, color: colors.brand },
  remove: { ...type.footnote, color: colors.ink3, textDecorationLine: 'underline' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  proTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.ink },
  proText: { ...type.caption, fontWeight: '500', color: colors.page },
});
