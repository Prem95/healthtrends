import Svg, { Circle, Polyline } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/** Mini trend: a quiet neutral line; only the latest point wears the status colour. */
export function Sparkline({
  values,
  tone = colors.neutral,
  width = 96,
  height = 32,
}: {
  values: number[];
  tone?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const [lx, ly] = pts[pts.length - 1];
  return (
    <Svg width={width} height={height} accessible={false}>
      <Polyline
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke={colors.neutral}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={lx} cy={ly} r={4.5} fill={tone} stroke={colors.paper} strokeWidth={2} />
    </Svg>
  );
}
