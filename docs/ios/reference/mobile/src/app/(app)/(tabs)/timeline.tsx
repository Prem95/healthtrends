import { formatInUnit, resolveDisplayUnit, statusTone, type LifeEvent, type ResultStatus, type TestSession } from '@domain';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField, FormError, Sheet, TextField } from '@/components/ui/form';
import { Button, Card, QueryState } from '@/components/ui/primitives';
import { StatusChip, StatusGlyph } from '@/components/ui/status';
import * as api from '@/lib/api';
import { needsAttention } from '@/lib/digest';
import { formatDate, prettyUnit, todayISO } from '@/lib/format';
import { useActiveProfile, useProfileRecord, useRecordMutation, useUnitPrefs } from '@/lib/queries';
import { colors, space, type } from '@/theme/tokens';

type Row = { resultId: string; biomarkerId: string; name: string; value: string; unit: string; status: ResultStatus };
type Entry = { kind: 'session'; date: string; session: TestSession } | { kind: 'event'; date: string; event: LifeEvent };

const OFFLINE_DELETE = 'Deleting needs a connection. Nothing was removed.';

/*
  Timeline: every test and life event on one rail, newest first, grouped by
  year. A test opens in place to show its results; a life event sits between
  tests as a dated note, so a change in a marker has its "why" beside it.
*/
export default function Timeline() {
  const insets = useSafeAreaInsets();
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const unitPrefs = useUnitPrefs();
  const [open, setOpen] = useState<string | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const removeEvent = useRecordMutation(profile?.id, api.deleteLifeEvent);
  const removeSession = useRecordMutation(profile?.id, api.deleteSession);

  if (!profile || record.isPending || record.isError) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <QueryState loading={!profile || record.isPending} error={record.error} onRetry={() => record.refetch()} />
      </View>
    );
  }

  const { sessions, events, summaries } = record.data;

  const rowsBySession = new Map<string, Row[]>();
  for (const s of summaries) {
    const unit = resolveDisplayUnit(s.biomarker, unitPrefs.data?.[s.biomarker.id]);
    for (const p of s.points) {
      const rows = rowsBySession.get(p.sessionId) ?? [];
      rows.push({
        resultId: p.resultId,
        biomarkerId: s.biomarker.id,
        name: s.biomarker.name,
        value: formatInUnit(s.biomarker, p.value, unit),
        unit: prettyUnit(unit),
        status: p.status,
      });
      rowsBySession.set(p.sessionId, rows);
    }
  }
  for (const rows of rowsBySession.values()) {
    rows.sort((a, b) => Number(needsAttention(b.status)) - Number(needsAttention(a.status)) || a.name.localeCompare(b.name));
  }

  const entries: Entry[] = [
    ...sessions.map((s) => ({ kind: 'session' as const, date: s.date, session: s })),
    ...events.map((e) => ({ kind: 'event' as const, date: e.date, event: e })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // The newest test starts open; afterwards one test at a time.
  const openId = open === undefined ? (sessions[0]?.id ?? null) : open;

  function confirmDeleteSession(session: TestSession, count: number) {
    Alert.alert(
      `Delete this test and its ${count} result${count === 1 ? '' : 's'}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            removeSession.mutate(session.id, {
              onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
              onError: () => Alert.alert('Not deleted', OFFLINE_DELETE),
            }),
        },
      ],
    );
  }

  function confirmDeleteEvent(event: LifeEvent) {
    Alert.alert('Remove this life event?', event.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeEvent.mutate(event.id, { onError: () => Alert.alert('Not removed', OFFLINE_DELETE) }),
      },
    ]);
  }

  // Build the scroll content flat, so each year heading can stick.
  const children: ReactElement[] = [];
  const sticky: number[] = [];
  children.push(
    <View key="head" style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} accessibilityRole="header">
          Timeline
        </Text>
        <Text style={styles.subtitle}>
          {`${profile.name} · ${sessions.length} test${sessions.length === 1 ? '' : 's'}`}
          {events.length > 0 ? ` · ${events.length} life event${events.length === 1 ? '' : 's'}` : ''}
        </Text>
      </View>
      <Button
        label="Event"
        variant="secondary"
        onPress={() => setAdding(true)}
        accessibilityLabel="Add a life event"
        style={{ minHeight: 40, paddingHorizontal: space.lg }}
      />
    </View>,
  );

  if (entries.length === 0) {
    children.push(
      <Card key="empty" style={{ gap: space.lg, alignItems: 'center' }}>
        <Text style={styles.emptyText}>Nothing here yet. Your first test will appear as soon as you add it.</Text>
        <Button label="Add results" onPress={() => router.push('/add-results')} />
      </Card>,
    );
  }

  let year = '';
  for (const entry of entries) {
    const y = entry.date.slice(0, 4);
    if (y !== year) {
      year = y;
      sticky.push(children.length);
      children.push(
        <View key={`y-${y}`} style={styles.yearBar}>
          <Text style={styles.year} accessibilityRole="header">
            {y}
          </Text>
        </View>,
      );
    }
    if (entry.kind === 'event') {
      const e = entry.event;
      children.push(
        <View key={e.id} style={styles.event}>
          <View style={styles.eventMark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventDate}>{formatDate(e.date)}</Text>
            <Text style={styles.eventLabel}>{e.label}</Text>
          </View>
          <Pressable
            onPress={() => confirmDeleteEvent(e)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove life event ${e.label}`}
          >
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>,
      );
    } else {
      const s = entry.session;
      const rows = rowsBySession.get(s.id) ?? [];
      children.push(
        <SessionCard
          key={s.id}
          session={s}
          rows={rows}
          open={openId === s.id}
          onToggle={() => setOpen(openId === s.id ? null : s.id)}
          onDelete={() => confirmDeleteSession(s, rows.length)}
        />,
      );
    }
  }

  return (
    <View style={styles.fill}>
      <ScrollView
        stickyHeaderIndices={sticky}
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: space.lg,
          gap: space.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={record.isRefetching}
            onRefresh={() => {
              record.refetch();
            }}
          />
        }
      >
        {children}
      </ScrollView>
      <AddLifeEvent profileId={profile.id} visible={adding} onClose={() => setAdding(false)} />
    </View>
  );
}

function SessionCard({
  session,
  rows,
  open,
  onToggle,
  onDelete,
}: {
  session: TestSession;
  rows: Row[];
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const out = rows.filter((r) => statusTone(r.status) === 'out').length;
  const borderline = rows.filter((r) => statusTone(r.status) === 'borderline').length;
  const meta = [session.labName, session.fasting ? 'fasting' : null, `${rows.length} result${rows.length === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' · ');
  const tally =
    out || borderline
      ? [out ? `${out} out of range` : null, borderline ? `${borderline} borderline` : null].filter(Boolean).join(', ')
      : rows.length > 0
        ? 'all in range'
        : '';

  return (
    <Card style={{ padding: 0 }}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Test on ${formatDate(session.date)}, ${meta}${tally ? `, ${tally}` : ''}`}
        style={({ pressed }) => [styles.sessionHead, pressed && { backgroundColor: colors.paper2 }]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
          <Text style={styles.sessionMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <View style={styles.tally}>
          {out > 0 && (
            <View style={styles.tallyItem}>
              <StatusGlyph status="HIGH" />
              <Text style={styles.tallyText}>{out}</Text>
            </View>
          )}
          {borderline > 0 && (
            <View style={styles.tallyItem}>
              <StatusGlyph status="BORDERLINE_HIGH" />
              <Text style={styles.tallyText}>{borderline}</Text>
            </View>
          )}
          {out === 0 && borderline === 0 && rows.length > 0 && (
            <View style={styles.tallyItem}>
              <StatusGlyph status="IN_RANGE" />
              <Text style={styles.tallyMuted}>all in range</Text>
            </View>
          )}
        </View>
      </Pressable>

      {open && (
        <View style={styles.sessionBody}>
          {session.notes ? <Text style={styles.notes}>{session.notes}</Text> : null}
          {rows.map((r) => (
            <Link key={r.resultId} href={{ pathname: '/marker/[id]', params: { id: r.biomarkerId } }} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${r.name}, ${r.value} ${r.unit}`}
                style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.resultName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.resultValue}>
                  {r.value}
                  <Text style={styles.unit}>{` ${r.unit}`}</Text>
                </Text>
                <StatusChip status={r.status} />
              </Pressable>
            </Link>
          ))}
          <Pressable onPress={onDelete} accessibilityRole="button" hitSlop={8} style={styles.deleteRow}>
            <Text style={styles.remove}>{`Delete this test and its ${rows.length} result${rows.length === 1 ? '' : 's'}`}</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
}

function AddLifeEvent({ profileId, visible, onClose }: { profileId: string; visible: boolean; onClose: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [label, setLabel] = useState('');
  const add = useRecordMutation(profileId, api.addLifeEvent);

  function close() {
    setLabel('');
    setDate(todayISO());
    add.reset();
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      title="Add a life event"
      onClose={close}
      action={{
        label: 'Add event',
        disabled: label.trim().length === 0,
        loading: add.isPending,
        onPress: () => add.mutate({ profileId, date, label }, { onSuccess: close }),
      }}
    >
      <Text style={styles.sheetLead}>
        A new medication, a diet change, surgery. It appears on every chart as a labelled line.
      </Text>
      <DateField label="Date" value={date} onChange={setDate} />
      <TextField
        label="What happened"
        value={label}
        onChangeText={setLabel}
        placeholder="Started vitamin D 2000 IU"
        maxLength={120}
        autoFocus
        returnKeyType="done"
      />
      <FormError>{add.isError ? 'Not saved. Check your connection and try again.' : null}</FormError>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  title: { ...type.largeTitle, color: colors.ink },
  subtitle: { ...type.footnote, color: colors.ink3, marginTop: 2 },
  emptyText: { ...type.subhead, color: colors.ink2, textAlign: 'center' },
  yearBar: { backgroundColor: colors.page, paddingTop: space.md, paddingBottom: space.xs },
  year: { fontFamily: 'ui-monospace', fontSize: 12, letterSpacing: 1, fontWeight: '500', color: colors.ink3 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
  eventMark: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.ink3 },
  eventDate: { ...type.caption, color: colors.ink3, fontVariant: ['tabular-nums'] },
  eventLabel: { ...type.subhead, fontWeight: '500', color: colors.ink },
  remove: { ...type.footnote, color: colors.ink3, textDecorationLine: 'underline' },
  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64 },
  sessionDate: { ...type.headline, color: colors.ink },
  sessionMeta: { ...type.caption, color: colors.ink3, marginTop: 2 },
  tally: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tallyText: { ...type.subhead, color: colors.ink2, fontVariant: ['tabular-nums'] },
  tallyMuted: { ...type.footnote, color: colors.ink3 },
  sessionBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingHorizontal: space.lg },
  notes: { ...type.subhead, color: colors.ink2, paddingTop: space.md },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    flexWrap: 'wrap',
  },
  resultName: { ...type.subhead, color: colors.ink, flex: 1, minWidth: 120 },
  resultValue: { ...type.subhead, fontWeight: '500', color: colors.ink, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: 'ui-monospace', fontSize: 12, fontWeight: '400', color: colors.ink3 },
  deleteRow: { paddingVertical: space.md, minHeight: 44, justifyContent: 'center' },
  sheetLead: { ...type.subhead, color: colors.ink2 },
});
