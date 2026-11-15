import type { ResultStatus } from '@domain';
import { STATUS_LABEL } from '@domain';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { STATUS_COLOR, STATUS_SHORT, STATUS_SOFT, colors } from '@/theme/tokens';

/*
  Status is never colour alone: a dot for in range, a diamond for borderline,
  an arrow pointing the way a value has left its range, a hollow ring when
  there is no range to judge against. Always beside a plain-language label.
*/

export function StatusGlyph({ status, size = 10 }: { status: ResultStatus; size?: number }) {
  const fill = STATUS_COLOR[status];
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10" accessible={false}>
      {status === 'IN_RANGE' && <Circle cx={5} cy={5} r={4} fill={fill} />}
      {(status === 'BORDERLINE_HIGH' || status === 'BORDERLINE_LOW') && (
        <Path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill={fill} />
      )}
      {status === 'HIGH' && <Path d="M5 1 9.5 9H0.5Z" fill={fill} />}
      {status === 'LOW' && <Path d="M5 9 0.5 1h9Z" fill={fill} />}
      {status === 'NO_RANGE' && <Circle cx={5} cy={5} r={3.25} fill="none" stroke={fill} strokeWidth={1.5} />}
    </Svg>
  );
}

export function StatusChip({ status }: { status: ResultStatus }) {
  return (
    <View
      style={[styles.chip, { backgroundColor: STATUS_SOFT[status] }]}
      accessible
      accessibilityLabel={STATUS_LABEL[status]}
    >
      <StatusGlyph status={status} />
      <Text style={styles.label} maxFontSizeMultiplier={1.3}>
        {STATUS_SHORT[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '500', color: colors.ink },
});
