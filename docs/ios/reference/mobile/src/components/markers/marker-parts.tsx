import { CATEGORY_LABEL, statusTone } from '@domain';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RangeBar } from '@/components/charts/range-bar';
import { Sparkline } from '@/components/charts/sparkline';
import { Card } from '@/components/ui/primitives';
import { StatusChip, StatusGlyph } from '@/components/ui/status';
import type { MarkerDigest } from '@/lib/digest';
import { formatDate } from '@/lib/format';
import { STATUS_COLOR, colors, space, type } from '@/theme/tokens';

/*
  The two ways a marker appears in a list: a card when it deserves a closer
  look, a row when it is one of many. Both open the marker's own screen.
*/

const hrefFor = (id: string): Href => ({ pathname: '/marker/[id]', params: { id } });

function a11y(d: MarkerDigest): string {
  return `${d.name}, ${d.valueLabel ?? 'no result'} ${d.valueLabel ? d.unit : ''}, ${statusTone(d.status).replace('-', ' ')}`;
}

export function MarkerCard({ d }: { d: MarkerDigest }) {
  return (
    <Link href={hrefFor(d.id)} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={a11y(d)} style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card style={{ gap: space.lg }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={styles.sub}>{CATEGORY_LABEL[d.category]}</Text>
            </View>
            <StatusChip status={d.status} />
          </View>
          <View style={[styles.rowBetween, { alignItems: 'flex-end' }]}>
            <Text style={styles.value}>
              {d.valueLabel}
              <Text style={styles.unit}>{`  ${d.unit}`}</Text>
            </Text>
            <Sparkline values={d.spark} tone={STATUS_COLOR[d.status]} width={104} height={34} />
          </View>
          {d.value != null && (
            <RangeBar
              value={d.value}
              min={d.rangeMin}
              max={d.rangeMax}
              status={d.status}
              displayFactor={d.displayFactor}
              labels
            />
          )}
          <Text style={styles.foot}>
            {d.deltaLabel && d.prevDate
              ? `${d.deltaLabel} ${d.unit} since ${formatDate(d.prevDate)}`
              : d.prevDate
                ? `Unchanged since ${formatDate(d.prevDate)}`
                : `First result ${d.date ? formatDate(d.date) : ''}`}
            {`  ·  ${d.count} result${d.count === 1 ? '' : 's'}`}
          </Text>
        </Card>
      </Pressable>
    </Link>
  );
}

export function MarkerRow({ d, last = false }: { d: MarkerDigest; last?: boolean }) {
  const hasValue = d.value != null;
  return (
    <Link href={hrefFor(d.id)} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y(d)}
        style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && { backgroundColor: colors.paper2 }]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {hasValue && d.date ? `${formatDate(d.date)} · ${d.count} result${d.count === 1 ? '' : 's'}` : 'No results yet'}
          </Text>
        </View>
        {hasValue && (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.rowValue, type.tabular]}>
              {d.valueLabel}
              <Text style={styles.unit}>{` ${d.unit}`}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <StatusGlyph status={d.status} />
              <Text style={styles.sub}>{statusTone(d.status) === 'in-range' ? 'In range' : statusTone(d.status) === 'out' ? 'Out of range' : statusTone(d.status) === 'borderline' ? 'Borderline' : 'No range'}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  name: { ...type.headline, color: colors.ink },
  sub: { ...type.caption, color: colors.ink3, marginTop: 2 },
  value: { fontSize: 32, lineHeight: 36, fontWeight: '500', letterSpacing: -0.8, color: colors.ink },
  unit: { fontFamily: 'ui-monospace', fontSize: 12, fontWeight: '400', color: colors.ink3, letterSpacing: 0 },
  foot: { ...type.caption, color: colors.ink3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: 14,
    minHeight: 60,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowValue: { ...type.headline, color: colors.ink },
});
