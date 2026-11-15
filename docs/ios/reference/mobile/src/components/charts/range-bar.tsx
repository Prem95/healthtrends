import type { ResultStatus } from '@domain';
import { formatMeasured } from '@domain';
import { StyleSheet, Text, View } from 'react-native';

import { STATUS_COLOR, colors } from '@/theme/tokens';

/*
  Where a value sits against its reference range: a thin track, the range as a
  band, one status-coloured dot. Same geometry as the web's RangeBar.
*/
export function RangeBar({
  value,
  min,
  max,
  status,
  labels = false,
  displayFactor = 1,
}: {
  value: number;
  min?: number;
  max?: number;
  status: ResultStatus;
  labels?: boolean;
  displayFactor?: number;
}) {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  if (!hasMin && !hasMax) return null;

  let ax0: number;
  let ax1: number;
  let bandL: number;
  let bandR: number;
  if (hasMin && hasMax) {
    const span = max! - min! || Math.abs(max!) || 1;
    ax0 = min! - span * 0.6;
    ax1 = max! + span * 0.6;
    bandL = min!;
    bandR = max!;
  } else if (hasMax) {
    ax0 = 0;
    ax1 = max! * 1.8 || 1;
    bandL = 0;
    bandR = max!;
  } else {
    const span = Math.abs(min!) || 1;
    ax0 = Math.max(0, min! - span * 1.2);
    ax1 = min! + span * 1.2;
    bandL = min!;
    bandR = ax1;
  }
  const rawSpan = ax1 - ax0 || 1;
  ax0 = Math.min(ax0, value - rawSpan * 0.06);
  ax1 = Math.max(ax1, value + rawSpan * 0.06);
  const span = ax1 - ax0 || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - ax0) / span) * 100));
  const left = pos(bandL);
  const right = pos(bandR);
  const dot = Math.max(2, Math.min(98, pos(value)));
  const fmt = (v: number) => formatMeasured(v / displayFactor);

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.track}>
        <View style={[styles.band, { left: `${left}%`, right: `${100 - right}%` }]} />
        <View style={[styles.dot, { left: `${dot}%`, backgroundColor: STATUS_COLOR[status] }]} />
      </View>
      {labels && (
        <View style={styles.labels}>
          {hasMin && <Text style={[styles.label, { left: `${left}%` }]}>{fmt(min!)}</Text>}
          {hasMax && <Text style={[styles.label, { left: `${right}%` }]}>{fmt(max!)}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.paper3, justifyContent: 'center' },
  band: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: 'rgba(10,143,108,0.30)' },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  labels: { height: 18, marginTop: 6 },
  label: {
    position: 'absolute',
    width: 60,
    marginLeft: -30,
    textAlign: 'center',
    fontSize: 11,
    color: colors.ink3,
    fontVariant: ['tabular-nums'],
  },
});
