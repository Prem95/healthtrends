import { router } from 'expo-router';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/ui/form';
import { Button, Card, Eyebrow, QueryState, Screen } from '@/components/ui/primitives';
import { StatusChip } from '@/components/ui/status';
import { formatDate } from '@/lib/format';
import { useActiveProfile, useEntitlement, useProfileRecord, useUnitPrefs } from '@/lib/queries';
import { DISCLAIMER, WINDOWS, buildSummary, summaryHtml, type SummaryLine, type SummaryWindow } from '@/lib/summary';
import { colors, space, type } from '@/theme/tokens';

/*
  Doctor summary (Pro): one page to hand over or send before an appointment.
  Flagged markers first, then every latest result in the window. The PDF is
  made on the phone and handed to the share sheet; it is never uploaded.
*/
export default function DoctorSummary() {
  const { profile } = useActiveProfile();
  const record = useProfileRecord(profile);
  const unitPrefs = useUnitPrefs();
  const entitlement = useEntitlement();
  const [span, setSpan] = useState<SummaryWindow>('1y');
  const [sharing, setSharing] = useState(false);

  const isPro = entitlement.data?.plan === 'pro';
  useEffect(() => {
    // A convenience over data the person can already read, so the gate is here.
    if (entitlement.data && !isPro) router.replace('/paywall');
  }, [entitlement.data, isPro]);

  if (!profile || !record.data || !entitlement.data || !isPro) {
    return (
      <Screen>
        <QueryState
          loading={!profile || record.isPending || entitlement.isPending || !isPro}
          error={record.error ?? entitlement.error}
          onRetry={() => {
            record.refetch();
            entitlement.refetch();
          }}
        />
      </Screen>
    );
  }

  const summary = buildSummary(record.data.summaries, unitPrefs.data ?? {}, span);

  async function share() {
    setSharing(true);
    let file: File | null = null;
    try {
      const { uri } = await Print.printToFileAsync({ html: summaryHtml(profile!.name, summary) });
      file = new File(uri);
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      Alert.alert('Could not make the PDF', 'Please try again.');
    } finally {
      if (file?.exists) file.delete();
      setSharing(false);
    }
  }

  return (
    <Screen contentStyle={{ paddingTop: space.lg, gap: space.xl }}>
      <Segmented
        label="Time window"
        options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
        value={span}
        onChange={setSpan}
      />
      <View style={{ gap: space.xs }}>
        <Eyebrow>Doctor summary</Eyebrow>
        <Text style={styles.title} accessibilityRole="header">
          {`${profile.name}’s results, on one page`}
        </Text>
        <Text style={styles.meta}>
          {`${summary.lines.length} marker${summary.lines.length === 1 ? '' : 's'}`}
          {summary.latestDate ? ` · latest test ${formatDate(summary.latestDate)}` : ''}
          {` · ${summary.windowText}`}
        </Text>
      </View>

      {summary.lines.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No results in this window. Try a longer one.</Text>
        </Card>
      ) : (
        <>
          {summary.flagged.length > 0 && (
            <View>
              <Text style={styles.section} accessibilityRole="header">
                {`Flagged for discussion  `}
                <Text style={styles.count}>{summary.flagged.length}</Text>
              </Text>
              <Card style={styles.list}>
                {summary.flagged.map((l, i) => (
                  <Line key={l.id} line={l} last={i === summary.flagged.length - 1} />
                ))}
              </Card>
            </View>
          )}
          <View>
            <Text style={styles.section} accessibilityRole="header">
              All results in this window
            </Text>
            <Card style={styles.list}>
              {summary.lines.map((l, i) => (
                <Line key={l.id} line={l} last={i === summary.lines.length - 1} detail />
              ))}
            </Card>
          </View>
          <View style={{ gap: space.sm }}>
            <Button label="Share or print" loading={sharing} onPress={share} />
            <Text style={styles.note}>Makes a PDF on this iPhone for Print, Mail, Files or AirDrop. Nothing is uploaded.</Text>
          </View>
        </>
      )}
      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </Screen>
  );
}

function Line({ line, last, detail = false }: { line: SummaryLine; last: boolean; detail?: boolean }) {
  return (
    <View style={[styles.line, !last && styles.divider]} accessible accessibilityLabel={`${line.name}, ${line.value} ${line.unit}, ${formatDate(line.date)}`}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name}>{line.name}</Text>
        {detail && <Text style={styles.sub}>{`${formatDate(line.date)} · reference ${line.reference}`}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.value}>
          {line.value}
          <Text style={styles.unit}>{` ${line.unit}`}</Text>
        </Text>
        <StatusChip status={line.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title1, color: colors.ink },
  meta: { ...type.footnote, color: colors.ink3 },
  empty: { ...type.subhead, color: colors.ink2, textAlign: 'center' },
  section: { ...type.headline, color: colors.ink, marginBottom: space.sm },
  count: { color: colors.ink3, fontWeight: '400' },
  list: { padding: 0 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  name: { ...type.subhead, fontWeight: '500', color: colors.ink },
  sub: { ...type.caption, color: colors.ink3, marginTop: 2 },
  value: { ...type.subhead, fontWeight: '500', color: colors.ink, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: 'ui-monospace', fontSize: 12, fontWeight: '400', color: colors.ink3 },
  note: { ...type.caption, color: colors.ink3, textAlign: 'center' },
  disclaimer: { ...type.caption, color: colors.ink3 },
});
