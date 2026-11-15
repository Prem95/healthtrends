import type { LifeEvent, RefRange, ResultStatus } from '@domain';
import { STATUS_LABEL, formatDelta, formatMeasured, statusTone } from '@domain';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import type { SeriesPoint } from '@/lib/analytics';
import { RangeBar } from '@/components/charts/range-bar';
import { StatusChip, StatusGlyph } from '@/components/ui/status';
import { formatDate, prettyUnit } from '@/lib/format';
import { STATUS_COLOR, colors, radius, space, type } from '@/theme/tokens';

/*
  One marker across the years (the app's hero visual, ported from the web's
  MarkerChart). A reading block sits over a single line: the reference range
  as a shaded band, each test a point shaped and coloured by its status.
  Dragging a finger across the chart moves the reading block to that test, so
  the block is both headline and tooltip. The history list under the chart is
  its plain-text twin for VoiceOver.
*/

const WINDOWS = [
  { key: '1y', label: '1Y', months: 12 },
  { key: '3y', label: '3Y', months: 36 },
  { key: '5y', label: '5Y', months: 60 },
  { key: 'all', label: 'All', months: null },
] as const;
type WindowKey = (typeof WINDOWS)[number]['key'];

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const H = 240;

function isoToTs(iso: string): number {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fmtRange(r: RefRange | null | undefined, factor: number): string | null {
  if (!r || (r.min == null && r.max == null)) return null;
  const d = (v: number) => formatMeasured(v / factor);
  if (r.min != null && r.max != null) return `${d(r.min)}–${d(r.max)}`;
  if (r.max != null) return `under ${d(r.max)}`;
  return `over ${d(r.min!)}`;
}

function niceTicks(lo: number, hi: number, target = 4): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}

/** A test on the line, drawn as its status shape with a surface ring. */
function PointMark({ status, s, x, y }: { status: ResultStatus; s: number; x: number; y: number }) {
  const common = { fill: STATUS_COLOR[status], stroke: colors.paper, strokeWidth: 2, strokeLinejoin: 'round' as const };
  const at = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
  switch (status) {
    case 'BORDERLINE_HIGH':
    case 'BORDERLINE_LOW':
      return <Path transform={at} d={`M0 ${-s - 1}L${s + 1} 0 0 ${s + 1}${-s - 1} 0Z`} {...common} />;
    case 'HIGH':
      return <Path transform={at} d={`M0 ${-s - 1}L${s + 1} ${s - 1}H${-s - 1}Z`} {...common} />;
    case 'LOW':
      return <Path transform={at} d={`M0 ${s + 1}L${s + 1} ${-s + 1}H${-s - 1}Z`} {...common} />;
    case 'NO_RANGE':
      return <Circle cx={x} cy={y} r={s - 1} fill={colors.paper} stroke={STATUS_COLOR[status]} strokeWidth={2} />;
    default:
      return <Circle cx={x} cy={y} r={s} {...common} />;
  }
}

export function MarkerChart({
  name,
  unit: rawUnit,
  displayFactor = 1,
  points,
  bandRange,
  events,
}: {
  name: string;
  unit: string;
  /** Divide canonical values by this to print them in `unit`. */
  displayFactor?: number;
  points: SeriesPoint[];
  bandRange: RefRange | null;
  events: LifeEvent[];
}) {
  const unit = prettyUnit(rawUnit);
  const toDisplay = (v: number) => formatMeasured(v / displayFactor);
  const [win, setWin] = useState<WindowKey>('all');
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(340);

  const all = useMemo(() => points.map((p) => ({ ...p, ts: isoToTs(p.date) })), [points]);
  const data = useMemo(() => {
    const months = WINDOWS.find((w) => w.key === win)?.months;
    if (months == null || all.length === 0) return all;
    const end = new Date(all[all.length - 1].ts);
    end.setUTCMonth(end.getUTCMonth() - months);
    return all.filter((p) => p.ts >= end.getTime());
  }, [all, win]);

  const latest = all[all.length - 1];
  if (!latest) return null;

  const values = data.map((p) => p.value);
  const bounds = [bandRange?.min, bandRange?.max].filter((v): v is number => v != null);
  const lo0 = Math.min(...values, ...bounds);
  const hi0 = Math.max(...values, ...bounds);
  const pad = (hi0 - lo0 || Math.abs(hi0) || 1) * 0.16;
  const domain = { min: Math.max(0, lo0 - pad), max: hi0 + pad };

  const tsMin = data.length ? data[0].ts : 0;
  const tsMax = data.length ? data[data.length - 1].ts : 1;

  const visibleEvents =
    data.length < 2
      ? []
      : events
          .map((e) => ({ ...e, ts: isoToTs(e.date) }))
          .filter((e) => e.ts >= tsMin && e.ts <= tsMax)
          .sort((a, b) => a.ts - b.ts);
  const M = { t: visibleEvents.length ? 30 : 14, r: 14, b: 28, l: 40 };
  const plotW = Math.max(0, W - M.l - M.r);
  const plotH = H - M.t - M.b;
  const x = (ts: number) => (tsMax === tsMin ? M.l + plotW / 2 : M.l + ((ts - tsMin) / (tsMax - tsMin)) * plotW);
  const y = (v: number) => H - M.b - ((v - domain.min) / (domain.max - domain.min || 1)) * plotH;

  const scrubbed = hover != null && data[hover] != null;
  const shown = scrubbed ? data[hover!] : latest;
  const shownIdx = all.findIndex((p) => p.resultId === shown.resultId);
  const prev = shownIdx > 0 ? all[shownIdx - 1] : null;
  const delta = prev ? shown.value - prev.value : null;

  const yTicks = niceTicks(domain.min / displayFactor, domain.max / displayFactor).map((d) => ({
    label: String(d),
    value: d * displayFactor,
  }));

  const span = tsMax - tsMin;
  const xTicks: { ts: number; label: string }[] = [];
  if (data.length >= 2 && span > 2 * YEAR_MS) {
    const y0 = new Date(tsMin).getUTCFullYear() + 1;
    const y1 = new Date(tsMax).getUTCFullYear();
    const step = Math.max(1, Math.ceil((y1 - y0 + 1) / Math.max(2, Math.floor(plotW / 56))));
    for (let yr = y0; yr <= y1; yr += step) xTicks.push({ ts: Date.UTC(yr, 0, 1), label: String(yr) });
  } else if (data.length >= 2) {
    for (let i = 0; i < 3; i++) {
      const ts = tsMin + (span * i) / 2;
      const d = new Date(ts);
      xTicks.push({ ts, label: `${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}` });
    }
  }

  const band =
    bandRange && (bandRange.min != null || bandRange.max != null)
      ? { top: y(bandRange.max ?? domain.max), bottom: y(bandRange.min ?? domain.min) }
      : null;
  const target = fmtRange(bandRange, displayFactor);
  const shownRange = fmtRange(shown.appliedRange ?? bandRange, displayFactor);
  const tones = new Set(data.map((p) => statusTone(p.status)));
  const legend = (
    [
      { tone: 'in-range', status: 'IN_RANGE', label: 'In range' },
      { tone: 'borderline', status: 'BORDERLINE_HIGH', label: 'Borderline' },
      { tone: 'out', status: 'HIGH', label: 'Out of range' },
      { tone: 'neutral', status: 'NO_RANGE', label: 'No reference range' },
    ] as const
  ).filter((l) => tones.has(l.tone));

  function scrubTo(locationX: number) {
    if (data.length === 0) return;
    let best = 0;
    let bestD = Infinity;
    data.forEach((p, i) => {
      const d = Math.abs(x(p.ts) - locationX);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== hover) {
      Haptics.selectionAsync();
      setHover(best);
    }
  }

  return (
    <View>
      {/* Reading block */}
      <Text style={styles.meta}>
        {scrubbed
          ? `${formatDate(shown.date)}${shown.labName ? ` · ${shown.labName}` : ''}`
          : `Latest result · ${formatDate(latest.date)}`}
      </Text>
      <View style={styles.readingRow}>
        <Text style={styles.reading} accessibilityLabel={`${toDisplay(shown.value)} ${unit}`}>
          {toDisplay(shown.value)}
          <Text style={styles.unit}>{`  ${unit}`}</Text>
        </Text>
        <StatusChip status={shown.status} />
      </View>
      <Text style={styles.delta}>
        {delta != null && prev
          ? `${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} ${formatDelta(delta / displayFactor, shown.value / displayFactor)} ${unit} since ${formatDate(prev.date)}`
          : 'First recorded value'}
        {shownRange ? <Text style={{ color: colors.ink3 }}>{`  ·  reference ${shownRange} ${unit}`}</Text> : null}
      </Text>
      {band && (
        <View style={{ marginTop: space.lg, maxWidth: 260 }}>
          <RangeBar
            value={shown.value}
            min={bandRange?.min ?? undefined}
            max={bandRange?.max ?? undefined}
            status={shown.status}
            displayFactor={displayFactor}
            labels
          />
        </View>
      )}

      {/* Time window */}
      <View style={styles.seg} accessibilityRole="tablist">
        {WINDOWS.map((w) => {
          const on = win === w.key;
          return (
            <Pressable
              key={w.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setHover(null);
                setWin(w.key);
              }}
              style={[styles.segItem, on && styles.segItemOn]}
              hitSlop={6}
            >
              <Text style={[styles.segLabel, on && { color: colors.ink }]}>{w.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Chart */}
      {data.length === 0 ? (
        <Text style={styles.empty}>No results in this window.</Text>
      ) : (
        <View
          onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${name} over time: ${data.length} measurements, latest ${toDisplay(latest.value)} ${unit}, ${STATUS_LABEL[latest.status]}${target ? `, reference range ${target} ${unit}` : ''}`}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => scrubTo(e.nativeEvent.locationX)}
          onResponderMove={(e) => scrubTo(e.nativeEvent.locationX)}
          onResponderRelease={() => setHover(null)}
          onResponderTerminate={() => setHover(null)}
          style={{ marginTop: space.md }}
        >
          <Svg width={W} height={H}>
            {yTicks.map((t) => (
              <G key={`y${t.label}`}>
                <Line x1={M.l} x2={W - M.r} y1={y(t.value)} y2={y(t.value)} stroke={colors.chartGrid} />
                <SvgText x={M.l - 8} y={y(t.value) + 4} textAnchor="end" fontSize={11} fill={colors.ink3}>
                  {t.label}
                </SvgText>
              </G>
            ))}

            {band && (
              <G>
                <Rect
                  x={M.l}
                  y={band.top}
                  width={plotW}
                  height={Math.max(0, band.bottom - band.top)}
                  fill={colors.inRange}
                  opacity={0.1}
                />
                {bandRange?.max != null && (
                  <Line x1={M.l} x2={W - M.r} y1={band.top} y2={band.top} stroke={colors.inRange} strokeOpacity={0.5} />
                )}
                {bandRange?.min != null && (
                  <Line x1={M.l} x2={W - M.r} y1={band.bottom} y2={band.bottom} stroke={colors.inRange} strokeOpacity={0.5} />
                )}
              </G>
            )}

            <Line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke={colors.chartAxis} />
            {!scrubbed &&
              xTicks.map((t) => (
                <SvgText key={t.ts} x={x(t.ts)} y={H - 9} textAnchor="middle" fontSize={11} fill={colors.ink3}>
                  {t.label}
                </SvgText>
              ))}

            {visibleEvents.map((e, i) => {
              const ex = x(e.ts);
              const flip = ex > W - M.r - 120;
              // Only the first and last labels are drawn when events crowd.
              const label = visibleEvents.length <= 2 || i === 0 || i === visibleEvents.length - 1;
              return (
                <G key={e.id}>
                  <Line x1={ex} x2={ex} y1={M.t - 6} y2={H - M.b} stroke={colors.chartAxis} />
                  {label && (
                    <SvgText
                      x={flip ? ex - 5 : ex + 5}
                      y={M.t - 10}
                      textAnchor={flip ? 'end' : 'start'}
                      fontSize={11}
                      fill={colors.ink2}
                    >
                      {e.label.length > 22 ? `${e.label.slice(0, 21)}…` : e.label}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {scrubbed && (
              <G>
                <Line x1={x(shown.ts)} x2={x(shown.ts)} y1={M.t} y2={H - M.b} stroke={colors.ink3} />
                <SvgText
                  x={Math.min(W - M.r - 36, Math.max(M.l + 36, x(shown.ts)))}
                  y={H - 9}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="500"
                  fill={colors.ink}
                >
                  {formatDate(shown.date)}
                </SvgText>
              </G>
            )}

            {data.length > 1 && (
              <Polyline
                points={data.map((p) => `${x(p.ts).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={colors.chartLine}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {data.map((p, i) => (
              <PointMark
                key={p.resultId}
                status={p.status}
                s={scrubbed && hover === i ? 8 : i === data.length - 1 ? 7 : 6}
                x={x(p.ts)}
                y={y(p.value)}
              />
            ))}
          </Svg>
        </View>
      )}

      {/* Legend */}
      {data.length > 0 && (
        <View style={styles.legend}>
          {target && (
            <View style={styles.legendItem}>
              <View style={styles.legendBand} />
              <Text style={styles.legendText}>{`Reference range ${target} ${unit}`}</Text>
            </View>
          )}
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <StatusGlyph status={l.status} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { ...type.footnote, color: colors.ink3 },
  readingRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md, marginTop: 6 },
  reading: { ...type.reading, color: colors.ink },
  unit: { fontFamily: 'ui-monospace', fontSize: 14, fontWeight: '400', color: colors.ink3, letterSpacing: 0 },
  delta: { ...type.footnote, color: colors.ink2, marginTop: space.md },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 2,
    padding: 3,
    marginTop: space.xl,
    backgroundColor: colors.paper2,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  segItem: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  segItemOn: { backgroundColor: colors.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong },
  segLabel: { fontSize: 13, fontWeight: '500', color: colors.ink3 },
  empty: { ...type.subhead, color: colors.ink3, textAlign: 'center', paddingVertical: space.xxxl },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 6, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBand: {
    width: 16,
    height: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(10,143,108,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(10,143,108,0.5)',
  },
  legendText: { ...type.caption, color: colors.ink3 },
});
