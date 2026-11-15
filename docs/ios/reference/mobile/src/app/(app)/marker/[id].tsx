import { conversionFactor, formatDelta, formatInUnit, resolveDisplayUnit } from '@domain';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MarkerChart } from '@/components/charts/marker-chart';
import { Button, Card, QueryState, Screen, SectionTitle } from '@/components/ui/primitives';
import { StatusChip } from '@/components/ui/status';
import * as api from '@/lib/api';
import { formatDate, prettyUnit } from '@/lib/format';
import { keys, useActiveProfile, useCatalog, useProfileRecord, useRecordMutation, useUnitPrefs } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

/* One marker, start to finish: the reading and its line, then the same data
   as a list (the chart's text twin). */
export default function MarkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const catalog = useCatalog();
  const unitPrefs = useUnitPrefs();
  const client = useQueryClient();

  const biomarker = catalog.data?.find((b) => b.id === id);
  const watch = useRecordMutation(profile?.id, (watched: boolean) => api.setWatched(profile!.id, id, watched));

  if (!biomarker || !record.data) {
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
        <Card>
          <Text style={styles.none}>{`No results recorded for ${profile!.name} yet.`}</Text>
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
              return (
                <View key={p.resultId} style={[styles.row, i < history.length - 1 && styles.rowDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowDate}>{formatDate(p.date)}</Text>
                    {p.labName && <Text style={styles.rowSub}>{p.labName}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.rowValue}>
                      {`${formatInUnit(biomarker, p.value, displayUnit)} ${prettyUnit(displayUnit)}`}
                      {delta != null && delta !== 0 && (
                        <Text style={styles.rowSub}>{`   ${delta > 0 ? '↑' : '↓'} ${formatDelta(delta / factor, p.value / factor)}`}</Text>
                      )}
                    </Text>
                    <StatusChip status={p.status} />
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      )}
    </Screen>
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
  none: { ...type.body, color: colors.ink2, textAlign: 'center', paddingVertical: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowDate: { ...type.subhead, color: colors.ink, fontVariant: ['tabular-nums'] },
  rowSub: { ...type.caption, color: colors.ink3, fontWeight: '400' },
  rowValue: { ...type.headline, color: colors.ink, fontVariant: ['tabular-nums'] },
});
