import {
  conversionFactor,
  formatDelta,
  formatInUnit,
  formatMeasured,
  parseDecimal,
  rangeInUnit,
  resolveDisplayUnit,
  resolveRange,
  toCanonical,
} from '@domain';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MarkerChart } from '@/components/charts/marker-chart';
import { FormError, Sheet, TextField } from '@/components/ui/form';
import { Button, Card, QueryState, Screen, SectionTitle } from '@/components/ui/primitives';
import { StatusChip } from '@/components/ui/status';
import * as api from '@/lib/api';
import { formatDate, formatRange, prettyUnit } from '@/lib/format';
import { keys, useActiveProfile, useCatalog, useProfileRecord, useRecordMutation, useUnitPrefs } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

/* One marker, start to finish: the reading and its line, then the same data
   as a list (the chart's text twin), then the range it is judged against. */
export default function MarkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const catalog = useCatalog();
  const unitPrefs = useUnitPrefs();
  const client = useQueryClient();
  const [editingRange, setEditingRange] = useState(false);

  const biomarker = catalog.data?.find((b) => b.id === id);
  const watch = useRecordMutation(profile?.id, (watched: boolean) => api.setWatched(profile!.id, id, watched));
  const removeResult = useRecordMutation(profile?.id, api.deleteResult);

  if (!biomarker || !record.data || !profile) {
    return (
      <Screen>
        <QueryState loading={record.isPending || catalog.isPending} error={record.error} onRetry={() => record.refetch()} />
      </Screen>
    );
  }

  const summary = record.data.summaries.find((s) => s.biomarker.id === id);
  const displayUnit = resolveDisplayUnit(biomarker, unitPrefs.data?.[biomarker.id]);
  const factor = conversionFactor(biomarker, displayUnit) ?? 1;
  const units = [biomarker.canonicalUnit, ...biomarker.altUnits.map((u) => u.unit)];
  const isWatched = record.data.watched.includes(id);
  const points = summary?.points ?? [];
  const history = [...points].reverse();
  const custom = record.data.customRanges[id] ?? null;
  const resolved = resolveRange(null, custom, biomarker.defaultRanges, profile.sex);
  const inUse = summary?.bandRange ?? resolved.range;
  const inUseLabel = formatRange(rangeInUnit(biomarker, inUse, displayUnit), formatMeasured);

  function confirmDelete(resultId: string, label: string) {
    Alert.alert('Delete this result?', label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          removeResult.mutate(resultId, {
            onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
            onError: () => Alert.alert('Not deleted', 'Deleting needs a connection. Nothing was removed.'),
          }),
      },
    ]);
  }

  return (
    <Screen contentStyle={{ gap: space.xl, paddingTop: space.lg }}>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {biomarker.name}
        </Text>
        <Button
          label={isWatched ? 'Watching' : 'Watch'}
          variant={isWatched ? 'primary' : 'secondary'}
          loading={watch.isPending}
          onPress={() => watch.mutate(!isWatched)}
          style={{ minHeight: 40, paddingHorizontal: space.lg }}
        />
      </View>

      {units.length > 1 && (
        <View style={styles.seg} accessibilityRole="tablist" accessibilityLabel="Display unit">
          {units.map((u) => {
            const on = u === displayUnit;
            return (
              <Pressable
                key={u}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={async () => {
                  await api.setDisplayUnit(biomarker, u);
                  client.invalidateQueries({ queryKey: keys.unitPrefs });
                }}
                style={[styles.segItem, on && styles.segItemOn]}
              >
                <Text style={[styles.segLabel, on && { color: colors.ink }]}>{prettyUnit(u)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {points.length > 0 ? (
        <Card>
          <MarkerChart
            name={biomarker.name}
            unit={displayUnit}
            displayFactor={factor}
            points={points}
            bandRange={summary!.bandRange}
            events={record.data.events}
          />
        </Card>
      ) : (
        <Card style={{ gap: space.lg, alignItems: 'center' }}>
          <Text style={styles.none}>{`No results recorded for ${biomarker.name} yet.`}</Text>
          <Button label="Add results" onPress={() => router.push('/add-results')} />
        </Card>
      )}

      {history.length > 0 && (
        <View>
          <SectionTitle title="History" count={history.length} />
          <Card style={{ padding: 0 }}>
            {history.map((p, i) => {
              const idx = points.findIndex((c) => c.resultId === p.resultId);
              const prev = idx > 0 ? points[idx - 1] : null;
              const delta = prev ? p.value - prev.value : null;
              const valueLabel = `${formatInUnit(biomarker, p.value, displayUnit)} ${prettyUnit(displayUnit)}`;
              const label = `${formatDate(p.date)}, ${valueLabel}`;
              return (
                <Pressable
                  key={p.resultId}
                  onLongPress={() => confirmDelete(p.resultId, label)}
                  accessibilityLabel={label}
                  accessibilityActions={[{ name: 'delete', label: 'Delete this result' }]}
                  onAccessibilityAction={(e) => {
                    if (e.nativeEvent.actionName === 'delete') confirmDelete(p.resultId, label);
                  }}
                  style={({ pressed }) => [styles.row, i < history.length - 1 && styles.rowDivider, pressed && { backgroundColor: colors.paper2 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowDate}>{formatDate(p.date)}</Text>
                    {p.labName && <Text style={styles.rowSub}>{p.labName}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.rowValue}>
                      {valueLabel}
                      {delta != null && delta !== 0 && (
                        <Text style={styles.rowSub}>{`   ${delta > 0 ? '↑' : '↓'} ${formatDelta(delta / factor, p.value / factor)}`}</Text>
                      )}
                    </Text>
                    <StatusChip status={p.status} />
                  </View>
                </Pressable>
              );
            })}
          </Card>
          <Text style={styles.hint}>Press and hold a result to delete it.</Text>
        </View>
      )}

      <View>
        <SectionTitle title="Reference range" />
        <Card style={{ gap: space.md }}>
          <Text style={styles.rangeValue}>
            {inUseLabel === '—' ? 'No range yet' : `${inUseLabel} ${prettyUnit(displayUnit)}`}
            {custom && <Text style={styles.rowSub}>{'   your own range'}</Text>}
          </Text>
          <Text style={styles.body}>
            A range printed on a specific report always wins for that result, then your own range, then the catalog
            default.
          </Text>
          {resolved.ambiguousSex && !custom && (
            <Text style={styles.body}>
              The typical range for this marker differs by sex. A result is only judged when the range from your own lab
              report is entered with it.
            </Text>
          )}
          <Button
            label={custom ? 'Change your own range' : 'Set your own range'}
            variant="secondary"
            onPress={() => setEditingRange(true)}
          />
        </Card>
      </View>

      {editingRange && (
        <OwnRangeSheet
            onClose={() => setEditingRange(false)}
          profileId={profile.id}
          biomarker={biomarker}
          unit={displayUnit}
          current={rangeInUnit(biomarker, custom, displayUnit)}
        />
      )}
    </Screen>
  );
}

/** Mounted only while open, so its fields always start from the current range. */
function OwnRangeSheet({
  onClose,
  profileId,
  biomarker,
  unit,
  current,
}: {
  onClose: () => void;
  profileId: string;
  biomarker: api.CatalogBiomarker;
  unit: string;
  current: { min?: number; max?: number } | null;
}) {
  const [min, setMin] = useState(current?.min != null ? formatMeasured(current.min) : '');
  const [max, setMax] = useState(current?.max != null ? formatMeasured(current.max) : '');
  const [error, setError] = useState<string | null>(null);
  const save = useRecordMutation(profileId, (range: { min?: number; max?: number } | null) =>
    api.setCustomRange(profileId, biomarker.id, range),
  );

  function submit() {
    const lo = min.trim() === '' ? null : parseDecimal(min);
    const hi = max.trim() === '' ? null : parseDecimal(max);
    if ((min.trim() !== '' && lo == null) || (max.trim() !== '' && hi == null)) {
      setError('Use numbers, or leave a field blank.');
      return;
    }
    if (lo != null && hi != null && lo > hi) {
      setError('The minimum must be less than or equal to the maximum.');
      return;
    }
    const range =
      lo == null && hi == null
        ? null
        : {
            ...(lo != null ? { min: toCanonical(biomarker, lo, unit) } : {}),
            ...(hi != null ? { max: toCanonical(biomarker, hi, unit) } : {}),
          };
    save.mutate(range, {
      onSuccess: onClose,
      onError: () => setError('Not saved. Check your connection and try again.'),
    });
  }

  return (
    <Sheet
      visible
      title="Your own range"
      onClose={onClose}
      action={{ label: 'Save range', onPress: submit, loading: save.isPending }}
    >
      <Text style={styles.body}>
        {`For ${biomarker.name}, in ${prettyUnit(unit)}. Use the range your doctor or lab gave you. Leave both blank and save to clear it.`}
      </Text>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <TextField label="Minimum" value={min} onChangeText={setMin} keyboardType="decimal-pad" style={{ flex: 1 }} />
        <TextField label="Maximum" value={max} onChangeText={setMax} keyboardType="decimal-pad" style={{ flex: 1 }} />
      </View>
      <FormError>{error}</FormError>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  title: { ...type.title1, color: colors.ink, flex: 1 },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    padding: 3,
    backgroundColor: colors.paper2,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  segItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9, minHeight: 36, justifyContent: 'center' },
  segItemOn: { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  segLabel: { fontSize: 13, fontWeight: '500', color: colors.ink3 },
  none: { ...type.body, color: colors.ink2, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowDate: { ...type.subhead, color: colors.ink, fontVariant: ['tabular-nums'] },
  rowSub: { ...type.caption, color: colors.ink3, fontWeight: '400' },
  rowValue: { ...type.headline, color: colors.ink, fontVariant: ['tabular-nums'] },
  hint: { ...type.caption, color: colors.ink3, marginTop: space.sm },
  rangeValue: { ...type.title2, color: colors.ink, fontVariant: ['tabular-nums'] },
  body: { ...type.subhead, color: colors.ink2 },
});
