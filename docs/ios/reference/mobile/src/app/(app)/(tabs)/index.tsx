import { CATEGORY_LABEL, statusTone, type BiomarkerCategory } from '@domain';
import { Link, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarkerCard, MarkerRow } from '@/components/markers/marker-parts';
import { StatusSummary } from '@/components/markers/status-summary';
import { Art } from '@/components/ui/art';
import { Button, Card, Eyebrow, QueryState, SectionTitle } from '@/components/ui/primitives';
import { StatusGlyph } from '@/components/ui/status';
import { attentionRank, needsAttention, toDigest, type MarkerDigest } from '@/lib/digest';
import { formatDate, monthsSince } from '@/lib/format';
import { useActiveProfile, useProfileRecord, useUnitPrefs } from '@/lib/queries';
import { colors, space, type } from '@/theme/tokens';

// Most-ordered systems first (same order as the web's CATEGORY_COMMON_ORDER).
const SYSTEM_ORDER: BiomarkerCategory[] = [
  'GLUCOSE', 'LIPIDS', 'CBC', 'LIVER', 'KIDNEY', 'THYROID', 'IRON', 'VITAMINS', 'HORMONES', 'OTHER',
];

/*
  Overview: the answer to "how am I doing?" on one screen. One headline count,
  then only what deserves a closer look as full cards, then everything else
  folded into its body system.
*/
export default function Overview() {
  const insets = useSafeAreaInsets();
  const { profile, profiles, setActive } = useActiveProfile();
  const record = useProfileRecord(profile);
  const unitPrefs = useUnitPrefs();

  if (!profile || record.isPending || record.isError) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <QueryState loading={!profile || record.isPending} error={record.error} onRetry={() => record.refetch()} />
      </View>
    );
  }

  const { summaries, sessions, watched } = record.data;

  if (sessions.length === 0) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + 90 }]}>
        <Art name="hero" flip scrim style={styles.empty}>
          <Eyebrow color="rgba(255,255,255,0.75)">First entry</Eyebrow>
          <Text style={styles.emptyTitle} accessibilityRole="header">
            {`Start ${profile.name}’s record with any report`}
          </Text>
          <Text style={styles.emptyBody}>
            Grab a lab report, even an old one. Panel shortcuts fill in the rows, so twenty results take
            about three minutes. Trends appear once a marker has two results.
          </Text>
          <Button label="Add your first results" variant="light" onPress={() => router.push('/add-results')} />
        </Art>
      </View>
    );
  }

  const digests = summaries.filter((s) => s.latest).map((s) => toDigest(s, unitPrefs.data ?? {}));
  const attention = digests.filter((d) => needsAttention(d.status)).sort((a, b) => attentionRank(b) - attentionRank(a));
  const watching = watched
    .map((id) => digests.find((d) => d.id === id))
    .filter((d): d is MarkerDigest => !!d && !needsAttention(d.status));
  const systems = SYSTEM_ORDER.map((category) => ({
    category,
    items: digests.filter((d) => d.category === category),
  })).filter((g) => g.items.length > 0);
  const latest = sessions[0];
  const months = monthsSince(latest.date);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 110, paddingHorizontal: space.lg, gap: space.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={record.isRefetching}
          onRefresh={() => {
            record.refetch();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">
            Overview
          </Text>
          <Text style={styles.subtitle}>
            {`${profile.name} · last test ${formatDate(latest.date)}${months >= 1 ? ` · ${months} month${months === 1 ? '' : 's'} ago` : ''}`}
          </Text>
        </View>
        <Button label="Add" onPress={() => router.push('/add-results')} accessibilityLabel="Add results" />
      </View>

      {profiles.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {profiles.map((p) => {
            const on = p.id === profile.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setActive(p.id)}
                style={[styles.profileChip, on && styles.profileChipOn]}
              >
                <Text style={[styles.profileChipLabel, on && { color: colors.page }]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <StatusSummary digests={digests} />

      <View>
        <SectionTitle title="Worth a closer look" count={attention.length} />
        {attention.length > 0 ? (
          <View style={{ gap: space.md }}>
            {attention.map((d) => (
              <MarkerCard key={d.id} d={d} />
            ))}
          </View>
        ) : (
          <Card style={styles.allClear}>
            <StatusGlyph status="IN_RANGE" size={12} />
            <Text style={styles.allClearText}>
              Every marker with a reference range is inside it on its latest test.
            </Text>
          </Card>
        )}
      </View>

      {watching.length > 0 && (
        <View>
          <SectionTitle title="Watching" count={watching.length} />
          <Card style={styles.list}>
            {watching.map((d, i) => (
              <MarkerRow key={d.id} d={d} last={i === watching.length - 1} />
            ))}
          </Card>
        </View>
      )}

      <View>
        <SectionTitle title="By body system" />
        <View style={{ gap: space.md }}>
          {systems.map(({ category, items }) => {
            const out = items.filter((d) => statusTone(d.status) === 'out').length;
            const borderline = items.filter((d) => statusTone(d.status) === 'borderline').length;
            const note =
              out || borderline
                ? [out ? `${out} out of range` : null, borderline ? `${borderline} borderline` : null]
                    .filter(Boolean)
                    .join(' · ')
                : 'All in range';
            return (
              <Link key={category} href={{ pathname: '/markers', params: { system: category } }} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={`${CATEGORY_LABEL[category]}, ${items.length} markers, ${note}`}>
                  <Card style={{ gap: space.md }}>
                    <View style={styles.systemHead}>
                      <Text style={styles.systemName}>{CATEGORY_LABEL[category]}</Text>
                      <Text style={styles.systemCount}>{`${items.length} marker${items.length === 1 ? '' : 's'}`}</Text>
                    </View>
                    <View style={styles.glyphs}>
                      {items.map((d) => (
                        <StatusGlyph key={d.id} status={d.status} size={12} />
                      ))}
                    </View>
                    <Text style={styles.systemNote}>{note}</Text>
                  </Card>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.largeTitle, color: colors.ink },
  subtitle: { ...type.footnote, color: colors.ink3, marginTop: 2 },
  profileChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
  },
  profileChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  profileChipLabel: { ...type.footnote, fontWeight: '500', color: colors.ink2 },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  allClearText: { ...type.subhead, color: colors.ink2, flex: 1 },
  list: { padding: 0 },
  systemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  systemName: { ...type.headline, color: colors.ink },
  systemCount: { ...type.caption, color: colors.ink3 },
  glyphs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  systemNote: { ...type.subhead, color: colors.ink2 },
  empty: { flex: 1, marginHorizontal: space.sm, padding: space.xl, justifyContent: 'flex-end', gap: space.lg },
  emptyTitle: { ...type.largeTitle, color: colors.white },
  emptyBody: { ...type.body, color: 'rgba(255,255,255,0.88)' },
});
