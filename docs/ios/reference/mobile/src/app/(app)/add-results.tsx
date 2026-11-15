import {
  PANELS,
  formatMeasured,
  rangeInUnit,
  resolveDisplayUnit,
  resolveRange,
  type Biomarker,
} from '@domain';
import * as Haptics from 'expo-haptics';
import { router, usePreventRemove } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InputAccessoryView,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField, FormError, TextField, formStyles } from '@/components/ui/form';
import { Button, QueryState, SectionTitle } from '@/components/ui/primitives';
import { ApiError, type CatalogBiomarker } from '@/lib/api';
import * as api from '@/lib/api';
import { sortByCommonality } from '@/lib/commonality';
import {
  ROW_ERROR_TEXT,
  findDuplicates,
  newRow,
  panelRowsToAdd,
  prepareRows,
  type EntryRow,
} from '@/lib/entry';
import { formatRange, prettyUnit, todayISO } from '@/lib/format';
import { useActiveProfile, useCatalog, useProfileRecord, useRecordMutation, useUnitPrefs } from '@/lib/queries';
import { colors, radius, space, type } from '@/theme/tokens';

const ACCESSORY = 'add-results-keys';

const SAVE_ERROR: Record<string, string> = {
  date_in_future: 'That date is in the future. Check the collection date.',
  too_many_results: 'A single test can hold up to 200 results. Split it into two tests.',
  invalid_results: 'Something in this test could not be saved. Check the values and try again.',
};
const OFFLINE = 'Not saved. You appear to be offline, and nothing was lost — try again when you have signal.';

/*
  Add results: a 20-marker report in about three minutes, without a mistake
  that silently corrupts the record. Date first, panels fill in the rows, one
  number per row, "Next" walks the rows. Before saving: convert to the
  canonical unit, question implausible values, warn about duplicates — then
  one atomic save.
*/
export default function AddResults() {
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const catalog = useCatalog();
  const unitPrefs = useUnitPrefs();

  const [date, setDate] = useState(todayISO());
  const [labName, setLabName] = useState('');
  const [fasting, setFasting] = useState(false);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [search, setSearch] = useState('');
  const [rangesOpen, setRangesOpen] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputs = useRef(new Map<string, TextInputInstance>());

  const save = useRecordMutation(profile?.id, api.createSession);

  const byId = useMemo(
    () => new Map<string, Biomarker>((catalog.data ?? []).map((b) => [b.id, b])),
    [catalog.data],
  );

  const dirty = !saved && (rows.some((r) => r.value.trim() !== '') || notes.trim() !== '' || labName.trim() !== '');
  usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert('Discard this test?', 'The values you typed will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: repeat },
    ]);
  });

  // Close only after the "unsaved changes" guard has been lifted.
  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

  if (!profile || catalog.isPending || catalog.isError) {
    return (
      <QueryState loading={!profile || catalog.isPending} error={catalog.error} onRetry={() => catalog.refetch()} />
    );
  }

  const prepared = prepareRows(rows, byId);
  const hasErrors = Object.keys(prepared.errors).length > 0;
  const lastLab = record.data?.sessions.find((s) => s.labName)?.labName;
  const searchResults = search.trim()
    ? sortByCommonality(
        (catalog.data ?? []).filter((b) => {
          if (b.archived) return false;
          const q = search.trim().toLowerCase();
          return b.name.toLowerCase().includes(q) || b.aliases.some((a) => a.toLowerCase().includes(q));
        }),
      ).slice(0, 8)
    : [];

  function addMarkers(ids: string[]) {
    const prefs = unitPrefs.data ?? {};
    setRows((current) => [
      ...current,
      ...ids.map((id) => {
        const b = byId.get(id)!;
        return newRow(b, resolveDisplayUnit(b, prefs[id]));
      }),
    ]);
    Haptics.selectionAsync();
  }

  function updateRow(key: string, patch: Partial<EntryRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setSaveError(null);
  }

  function focusNext() {
    const idx = rows.findIndex((r) => r.key === focused);
    const next = rows[idx + 1];
    if (next) inputs.current.get(next.key)?.focus();
    else inputs.current.get(focused ?? '')?.blur();
  }

  /** Walk the checks in order; each confirmation re-enters with the updated rows. */
  function attemptSave(current: EntryRow[], duplicatesAcknowledged = false) {
    const p = prepareRows(current, byId);
    if (Object.keys(p.errors).length > 0 || p.results.length === 0) return;

    const first = p.implausible[0];
    if (first) {
      const row = current.find((r) => r.key === first.key)!;
      const buttons: Parameters<typeof Alert.alert>[2] = [];
      if (first.suggestedUnit) {
        const unit = first.suggestedUnit;
        buttons.push({
          text: `Use ${prettyUnit(unit)}`,
          onPress: () => {
            const next = current.map((r) => (r.key === row.key ? { ...r, unit } : r));
            setRows(next);
            attemptSave(next, duplicatesAcknowledged);
          },
        });
      }
      buttons.push({
        text: 'The value is correct',
        onPress: () => {
          const next = current.map((r) => (r.key === row.key ? { ...r, confirmed: true } : r));
          setRows(next);
          attemptSave(next, duplicatesAcknowledged);
        },
      });
      buttons.push({ text: 'Let me edit', style: 'cancel', onPress: () => inputs.current.get(row.key)?.focus() });
      Alert.alert(
        'Double-check this value',
        first.suggestionLabel ? `${first.message} Did you mean ${first.suggestionLabel}?` : first.message,
        buttons,
      );
      return;
    }

    if (!duplicatesAcknowledged && record.data) {
      const existing = record.data.summaries.flatMap((s) =>
        s.points.map((pt) => ({ biomarkerId: s.biomarker.id, date: pt.date })),
      );
      const dupes = findDuplicates(p.results, date, existing);
      if (dupes.length > 0) {
        const names = dupes.map((id) => byId.get(id)?.name ?? id);
        Alert.alert(
          'Already recorded on this date',
          `${names.join(', ')} already ${names.length === 1 ? 'has a value' : 'have values'} on this date. Saving will add a second entry.`,
          [
            { text: 'Let me edit', style: 'cancel' },
            { text: 'Save anyway', onPress: () => attemptSave(current, true) },
          ],
        );
        return;
      }
    }

    save.mutate(
      {
        profileId: profile!.id,
        date,
        labName: labName.trim() || undefined,
        fasting,
        notes: notes.trim() || undefined,
        results: p.results,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaved(true);
        },
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : 'request_failed';
          if (code === 'session_limit') {
            Alert.alert(
              'The Free plan includes 20 tests',
              'Your 20 are all still here and readable. Pro removes the limit.',
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'See Pro', onPress: () => router.push('/paywall') },
              ],
            );
            return;
          }
          setSaveError(SAVE_ERROR[code] ?? OFFLINE);
        },
      },
    );
  }

  const count = prepared.results.length;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.fill}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" style={{ width: 84 }}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header">
          Add results
        </Text>
        <View style={{ width: 84 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Part A — about this test */}
        <View style={styles.group}>
          <DateField label="Collection date" value={date} onChange={setDate} />
          <View style={styles.divider} />
          <TextField label="Lab (optional)" value={labName} onChangeText={setLabName} maxLength={120} placeholder="e.g. Quest" />
          {lastLab && labName.trim() === '' && (
            <Pressable onPress={() => setLabName(lastLab)} accessibilityRole="button" style={styles.suggest}>
              <Text style={styles.suggestText}>{`Use “${lastLab}”`}</Text>
            </Pressable>
          )}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Fasting</Text>
            <Switch value={fasting} onValueChange={setFasting} accessibilityLabel="Fasting" />
          </View>
        </View>

        {/* Part B — which markers */}
        <View>
          <SectionTitle title="Add from a panel" />
          <View style={styles.chips}>
            {PANELS.map((panel) => {
              const toAdd = panelRowsToAdd(panel.biomarkerIds, rows, byId);
              const done = toAdd.length === 0;
              return (
                <Pressable
                  key={panel.id}
                  onPress={() => !done && addMarkers(toAdd)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: done }}
                  accessibilityLabel={done ? `${panel.name}, added` : `Add ${panel.name}`}
                  style={[styles.chip, done && styles.chipDone]}
                >
                  <Text style={[styles.chipText, done && { color: colors.brand }]} maxFontSizeMultiplier={1.3}>
                    {done ? `✓ ${panel.name}` : `+ ${panel.name}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Or add one marker — LDL, A1c, ferritin"
            placeholderTextColor={colors.ink3}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Add a single marker"
            style={[formStyles.input, { marginTop: space.md }]}
          />
          {searchResults.length > 0 && (
            <View style={styles.results}>
              {searchResults.map((b) => {
                const present = rows.some((r) => r.biomarkerId === b.id);
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      if (!present) addMarkers([b.id]);
                      setSearch('');
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.resultItem, pressed && { backgroundColor: colors.paper2 }]}
                  >
                    <Text style={styles.resultName}>{b.name}</Text>
                    <Text style={styles.resultMeta}>{present ? 'Added' : prettyUnit(b.canonicalUnit)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Part C — results */}
        {rows.length > 0 && (
          <View>
            <SectionTitle title="Results" count={rows.length} />
            <View style={{ gap: space.md }}>
              {rows.map((row) => {
                const b = byId.get(row.biomarkerId) as CatalogBiomarker | undefined;
                if (!b) return null;
                const units = [b.canonicalUnit, ...b.altUnits.map((u) => u.unit)];
                const custom = record.data?.customRanges[b.id] ?? null;
                const usual = resolveRange(null, custom, b.defaultRanges, profile.sex).range;
                const usualLabel = formatRange(rangeInUnit(b, usual, row.unit), formatMeasured);
                const error = prepared.errors[row.key];
                const showRange = rangesOpen[row.key] || row.refMin !== '' || row.refMax !== '';
                return (
                  <View key={row.key} style={styles.row}>
                    <View style={styles.rowHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{b.name}</Text>
                        {usualLabel !== '—' && (
                          <Text style={styles.rowHint}>{`${custom ? 'your range' : 'usual range'} ${usualLabel} ${prettyUnit(row.unit)}`}</Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => setRows((cur) => cur.filter((r) => r.key !== row.key))}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${b.name}`}
                        style={styles.remove}
                      >
                        <Text style={styles.removeText}>×</Text>
                      </Pressable>
                    </View>

                    <View style={styles.valueLine}>
                      <TextInput
                        ref={(el) => {
                          if (el) inputs.current.set(row.key, el);
                          else inputs.current.delete(row.key);
                        }}
                        value={row.value}
                        onChangeText={(value) => updateRow(row.key, { value, confirmed: false })}
                        onFocus={() => setFocused(row.key)}
                        keyboardType="decimal-pad"
                        inputAccessoryViewID={ACCESSORY}
                        placeholder="Value"
                        placeholderTextColor={colors.ink3}
                        accessibilityLabel={`${b.name} value in ${prettyUnit(row.unit)}`}
                        style={[formStyles.input, styles.valueInput, error === 'not_a_number' && styles.inputError]}
                      />
                      {units.length > 1 ? (
                        <View style={styles.units} accessibilityRole="radiogroup" accessibilityLabel={`${b.name} unit`}>
                          {units.map((u) => {
                            const on = u === row.unit;
                            return (
                              <Pressable
                                key={u}
                                onPress={() => updateRow(row.key, { unit: u, confirmed: false })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: on }}
                                hitSlop={4}
                                style={[styles.unitPill, on && styles.unitPillOn]}
                              >
                                <Text style={[styles.unitText, on && { color: colors.page }]} maxFontSizeMultiplier={1.3}>
                                  {prettyUnit(u)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.unitPlain}>{prettyUnit(row.unit)}</Text>
                      )}
                    </View>

                    {showRange ? (
                      <View style={styles.rangeLine}>
                        <Text style={styles.rowHint}>Range on report</Text>
                        <TextInput
                          value={row.refMin}
                          onChangeText={(refMin) => updateRow(row.key, { refMin, confirmed: false })}
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={ACCESSORY}
                          placeholder="low"
                          placeholderTextColor={colors.ink3}
                          accessibilityLabel={`${b.name} lowest value of the report's range`}
                          style={[formStyles.input, styles.rangeInput]}
                        />
                        <Text style={styles.rowHint}>–</Text>
                        <TextInput
                          value={row.refMax}
                          onChangeText={(refMax) => updateRow(row.key, { refMax, confirmed: false })}
                          keyboardType="decimal-pad"
                          inputAccessoryViewID={ACCESSORY}
                          placeholder="high"
                          placeholderTextColor={colors.ink3}
                          accessibilityLabel={`${b.name} highest value of the report's range`}
                          style={[formStyles.input, styles.rangeInput]}
                        />
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => setRangesOpen((o) => ({ ...o, [row.key]: true }))}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text style={styles.link}>Add the range from your report</Text>
                      </Pressable>
                    )}
                    {error && <Text style={styles.rowError}>{ROW_ERROR_TEXT[error]}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          maxLength={2000}
          multiline
          placeholder="Anything worth remembering about this test"
          style={{ marginTop: space.sm }}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <FormError>{saveError}</FormError>
        {hasErrors && <Text style={styles.footHint}>Some values are not numbers yet.</Text>}
        {!hasErrors && count === 0 && (
          <Text style={styles.footHint}>
            {rows.length === 0 ? 'Add a panel or a marker, then type the values.' : 'Type at least one value.'}
          </Text>
        )}
        <Button
          label={count > 0 ? `Save test · ${count} result${count === 1 ? '' : 's'}` : 'Save test'}
          disabled={hasErrors || count === 0}
          loading={save.isPending}
          onPress={() => attemptSave(rows)}
        />
      </View>

      <InputAccessoryView nativeID={ACCESSORY}>
        <View style={styles.accessory}>
          <Pressable onPress={() => inputs.current.get(focused ?? '')?.blur()} hitSlop={10} accessibilityRole="button">
            <Text style={styles.accessoryText}>Done</Text>
          </Pressable>
          <Pressable onPress={focusNext} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.accessoryText, { fontWeight: '600' }]}>Next</Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  cancel: { ...type.body, color: colors.ink2 },
  barTitle: { ...type.headline, color: colors.ink, flex: 1, textAlign: 'center' },
  content: { padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl },
  group: {
    backgroundColor: colors.paper,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    padding: space.lg,
    gap: space.md,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  suggest: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  suggestText: { ...type.footnote, fontWeight: '500', color: colors.brand },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  switchLabel: { ...type.body, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
  },
  chipDone: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  chipText: { ...type.footnote, fontWeight: '500', color: colors.ink },
  results: {
    marginTop: space.sm,
    backgroundColor: colors.paper,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  resultName: { ...type.subhead, color: colors.ink, flex: 1 },
  resultMeta: { ...type.caption, color: colors.ink3 },
  row: {
    backgroundColor: colors.paper,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    padding: space.lg,
    gap: space.sm,
  },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rowName: { ...type.headline, color: colors.ink },
  rowHint: { ...type.caption, color: colors.ink3 },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 22, lineHeight: 24, color: colors.ink3 },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  valueInput: { flexGrow: 1, flexBasis: 110, textAlign: 'right', fontVariant: ['tabular-nums'] },
  inputError: { borderColor: '#AD2247', borderWidth: 1 },
  units: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  unitPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
  },
  unitPillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  unitText: { fontFamily: 'ui-monospace', fontSize: 12, color: colors.ink2 },
  unitPlain: { fontFamily: 'ui-monospace', fontSize: 12, color: colors.ink3, paddingHorizontal: space.xs },
  rangeLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rangeInput: { flex: 1, minHeight: 40, textAlign: 'right' },
  link: { ...type.footnote, color: colors.brand },
  rowError: { ...type.footnote, color: '#AD2247' },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    backgroundColor: colors.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  footHint: { ...type.footnote, color: colors.ink3, textAlign: 'center' },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    backgroundColor: colors.paper2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineStrong,
  },
  accessoryText: { ...type.body, color: colors.brand },
});
