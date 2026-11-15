import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@/lib/supabase';

/*
  "Your data is yours": a full export, free on every plan. Built on the
  device from the user's own rows (row-level security guarantees they are the
  only rows visible) and handed to the iOS share sheet. The file is written
  to the cache directory and removed after sharing.
*/

async function collect() {
  const [profiles, sessions, results, events, custom] = await Promise.all([
    supabase.from('profiles').select('id, name, sex, date_of_birth'),
    supabase.from('test_sessions').select('id, profile_id, date, lab_name, ordered_by, fasting, notes'),
    supabase
      .from('test_results')
      .select('id, session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note'),
    supabase.from('life_events').select('id, profile_id, date, label'),
    supabase
      .from('biomarkers')
      .select('id, name, category, canonical_unit, alt_units, default_ranges, archived')
      .eq('is_custom', true),
  ]);
  const error = profiles.error ?? sessions.error ?? results.error ?? events.error ?? custom.error;
  if (error) throw error;
  return {
    profiles: profiles.data ?? [],
    sessions: sessions.data ?? [],
    results: results.data ?? [],
    lifeEvents: events.data ?? [],
    customBiomarkers: custom.data ?? [],
  };
}

const cell = (v: unknown) => {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportData(format: 'json' | 'csv'): Promise<void> {
  const data = await collect();
  const stamp = new Date().toISOString().slice(0, 10);

  let body: string;
  if (format === 'json') {
    body = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'bbiom', schemaVersion: 1, ...data }, null, 2);
  } else {
    const profileName = new Map(data.profiles.map((p) => [p.id, p.name]));
    const session = new Map(data.sessions.map((s) => [s.id, s]));
    const rows = data.results.map((r) => {
      const s = session.get(r.session_id);
      return [
        s ? profileName.get(s.profile_id) : '',
        s?.date,
        s?.lab_name,
        r.biomarker_id,
        r.value,
        r.entered_unit,
        r.lab_range,
        r.note,
      ]
        .map(cell)
        .join(',');
    });
    body = ['profile,date,lab,biomarker,value_canonical,entered_unit,lab_range,note', ...rows].join('\n');
  }

  const file = new File(Paths.cache, `bbiom-export-${stamp}.${format}`);
  if (file.exists) file.delete();
  file.create();
  file.write(body);
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'json' ? 'application/json' : 'text/csv',
      UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
    });
  } finally {
    if (file.exists) file.delete();
  }
}
