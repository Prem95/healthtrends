import { statusTone, type ResultStatus } from '@domain';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/primitives';
import { StatusGlyph } from '@/components/ui/status';
import type { MarkerDigest } from '@/lib/digest';
import { colors, space, type } from '@/theme/tokens';

/** The headline read: how many markers are in range on their latest test. */
export function StatusSummary({ digests }: { digests: MarkerDigest[] }) {
  const inRange = digests.filter((d) => d.status === 'IN_RANGE').length;
  const borderline = digests.filter((d) => statusTone(d.status) === 'borderline').length;
  const out = digests.filter((d) => statusTone(d.status) === 'out').length;
  const noRange = digests.filter((d) => d.status === 'NO_RANGE').length;
  const parts = [
    { n: inRange, color: colors.inRange },
    { n: borderline, color: colors.borderline },
    { n: out, color: colors.out },
    { n: noRange, color: colors.neutral },
  ].filter((p) => p.n > 0);

  return (
    <Card wash>
      <Text style={styles.label}>Latest result for each marker</Text>
      <View
        style={styles.headline}
        accessible
        accessibilityLabel={`${inRange} of ${digests.length} markers in range, ${borderline} borderline, ${out} out of range`}
      >
        <Text style={styles.figure}>{inRange}</Text>
        <Text style={styles.of}>{`of ${digests.length} marker${digests.length === 1 ? '' : 's'} in range`}</Text>
      </View>
      <View style={styles.meter} accessible={false}>
        {parts.map((p, i) => (
          <View key={i} style={{ flex: p.n, backgroundColor: p.color, borderRadius: 4 }} />
        ))}
      </View>
      <View style={styles.tallies}>
        <Tally status="IN_RANGE" label="In range" n={inRange} />
        <Tally status="BORDERLINE_HIGH" label="Borderline" n={borderline} />
        <Tally status="HIGH" label="Out of range" n={out} last />
      </View>
    </Card>
  );
}

function Tally({ status, label, n, last }: { status: ResultStatus; label: string; n: number; last?: boolean }) {
  return (
    <View style={[styles.tally, !last && styles.tallyDivider]}>
      <View style={styles.tallyLabel}>
        <StatusGlyph status={status} />
        <Text style={styles.tallyText}>{label}</Text>
      </View>
      <Text style={styles.tallyN}>{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.subhead, color: colors.ink3 },
  headline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space.md, marginTop: space.sm },
  figure: { ...type.reading, color: colors.ink },
  of: { ...type.body, color: colors.ink2 },
  meter: { flexDirection: 'row', gap: 2, height: 8, marginTop: space.xl },
  tallies: { marginTop: space.md },
  tally: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  tallyDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tallyLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tallyText: { ...type.subhead, color: colors.ink2 },
  tallyN: { ...type.headline, color: colors.ink, fontVariant: ['tabular-nums'] },
});
