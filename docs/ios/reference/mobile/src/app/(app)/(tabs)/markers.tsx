import { CATEGORY_LABEL, resolveDisplayUnit, type BiomarkerCategory } from '@domain';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MarkerRow } from '@/components/markers/marker-parts';
import { formStyles, Segmented } from '@/components/ui/form';
import { Card, QueryState } from '@/components/ui/primitives';
import type { CatalogBiomarker } from '@/lib/api';
import { CATEGORY_COMMON_ORDER, sortByCommonality } from '@/lib/commonality';
import { needsAttention, toDigest, type MarkerDigest } from '@/lib/digest';
import { prettyUnit } from '@/lib/format';
import { useActiveProfile, useCatalog, useProfileRecord, useUnitPrefs } from '@/lib/queries';
import { colors, space, type } from '@/theme/tokens';

type Scope = 'results' | 'attention' | 'all';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'results', label: 'With results' },
  { value: 'attention', label: 'Worth a look' },
  { value: 'all', label: 'Whole catalog' },
];

/** A catalog marker with no results yet, in the shape a row expects. */
function emptyDigest(b: CatalogBiomarker, unitPrefs: Record<string, string>): MarkerDigest {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    isCustom: b.isCustom,
    unit: prettyUnit(resolveDisplayUnit(b, unitPrefs[b.id])),
    displayFactor: 1,
    count: 0,
    value: null,
    valueLabel: null,
    date: null,
    status: 'NO_RANGE',
    spark: [],
    deltaLabel: null,
    prevDate: null,
  };
}

function matches(b: CatalogBiomarker, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return b.name.toLowerCase().includes(needle) || b.aliases.some((a) => a.toLowerCase().includes(needle));
}

/*
  Markers: find any marker fast, by the name or abbreviation printed on the
  report. Grouped by body system, most-ordered markers first.
*/
export default function Markers() {
  const insets = useSafeAreaInsets();
  const { system } = useLocalSearchParams<{ system?: string }>();
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const catalog = useCatalog();
  const unitPrefs = useUnitPrefs();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const sectionY = useRef<Partial<Record<BiomarkerCategory, number>>>({});

  const hasResults = (record.data?.summaries.length ?? 0) > 0;
  const activeScope: Scope = scope ?? (hasResults ? 'results' : 'all');

  // Arriving from an Overview body-system card: show results, jump to that system.
  const [arrivedFor, setArrivedFor] = useState<string | undefined>(undefined);
  if (system && system !== arrivedFor) {
    setArrivedFor(system);
    setScope('results');
    setQuery('');
  }
  useEffect(() => {
    if (!system) return;
    const t = setTimeout(() => {
      const y = sectionY.current[system as BiomarkerCategory];
      if (y != null) scroll.current?.scrollTo({ y, animated: true });
    }, 120);
    return () => clearTimeout(t);
  }, [system]);

  const sections = useMemo(() => {
    if (!record.data || !catalog.data) return [];
    const prefs = unitPrefs.data ?? {};
    const digests = new Map<string, MarkerDigest>();
    for (const s of record.data.summaries) if (s.latest) digests.set(s.biomarker.id, toDigest(s, prefs));

    const pool = catalog.data.filter((b) => {
      if (b.archived && !digests.has(b.id)) return false;
      if (!matches(b, query)) return false;
      const d = digests.get(b.id);
      if (activeScope === 'results') return !!d;
      if (activeScope === 'attention') return !!d && needsAttention(d.status);
      return true;
    });

    return CATEGORY_COMMON_ORDER.map((category) => ({
      category,
      items: sortByCommonality(pool.filter((b) => b.category === category)).map(
        (b) => digests.get(b.id) ?? emptyDigest(b, prefs),
      ),
    })).filter((s) => s.items.length > 0);
  }, [record.data, catalog.data, unitPrefs.data, query, activeScope]);

  if (!profile || record.isPending || catalog.isPending || record.isError || catalog.isError) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <QueryState
          loading={!profile || record.isPending || catalog.isPending}
          error={record.error ?? catalog.error}
          onRetry={() => {
            record.refetch();
            catalog.refetch();
          }}
        />
      </View>
    );
  }

  const emptyText = query
    ? 'No markers match. Try the whole catalog or a different spelling.'
    : activeScope === 'attention'
      ? 'Nothing is outside or near a limit on its latest test.'
      : activeScope === 'results'
        ? `No results recorded for ${profile.name} yet.`
        : 'No markers in the catalog.';

  return (
    <View style={[styles.fill, { paddingTop: insets.top + space.lg }]}>
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">
          Markers
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or abbreviation — LDL, A1c, TSH"
          placeholderTextColor={colors.ink3}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Search markers"
          style={formStyles.input}
        />
        <Segmented label="Which markers" options={SCOPES} value={activeScope} onChange={setScope} />
      </View>

      <ScrollView
        ref={scroll}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 110, gap: space.xl }}
        refreshControl={
          <RefreshControl
            refreshing={record.isRefetching}
            onRefresh={() => {
              record.refetch();
            }}
          />
        }
      >
        {sections.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{emptyText}</Text>
          </Card>
        ) : (
          sections.map(({ category, items }) => (
            <View
              key={category}
              onLayout={(e) => {
                sectionY.current[category] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.section} accessibilityRole="header">
                {CATEGORY_LABEL[category]}
                <Text style={styles.count}>{`  ${items.length}`}</Text>
              </Text>
              <Card style={styles.list}>
                {items.map((d, i) => (
                  <MarkerRow key={d.id} d={d} last={i === items.length - 1} />
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  top: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  title: { ...type.largeTitle, color: colors.ink },
  section: { ...type.headline, color: colors.ink, marginBottom: space.sm },
  count: { color: colors.ink3, fontWeight: '400' },
  list: { padding: 0 },
  empty: { ...type.subhead, color: colors.ink2, textAlign: 'center' },
});
