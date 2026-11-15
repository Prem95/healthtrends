import type { Biomarker, LifeEvent, Profile, RefRange, TestSession } from '@domain';

import type { CatalogBiomarker, Entitlement } from '@/lib/api';
import type { ResultWithSession } from '@/lib/analytics';

/*
  One small, realistic account: Sam, two tests (2024 and 2026), one life
  event, a Free plan. Tests mutate `db` before rendering to set up a case.
*/

function marker(b: Omit<Biomarker, 'aliases' | 'isCustom' | 'altUnits'> & Partial<Biomarker>): CatalogBiomarker {
  return { aliases: [], altUnits: [], isCustom: false, archived: false, ...b };
}

const MMOL_CHOL = [{ unit: 'mmol/L', toCanonical: 38.67 }];

export const CATALOG: CatalogBiomarker[] = [
  marker({ id: 'total-cholesterol', name: 'Total Cholesterol', category: 'LIPIDS', canonicalUnit: 'mg/dL', altUnits: MMOL_CHOL, defaultRanges: [{ max: 200 }] }),
  marker({ id: 'ldl-cholesterol', name: 'LDL Cholesterol', aliases: ['ldl'], category: 'LIPIDS', canonicalUnit: 'mg/dL', altUnits: MMOL_CHOL, defaultRanges: [{ max: 100 }] }),
  marker({ id: 'hdl-cholesterol', name: 'HDL Cholesterol', aliases: ['hdl'], category: 'LIPIDS', canonicalUnit: 'mg/dL', altUnits: MMOL_CHOL, defaultRanges: [{ sex: 'M', min: 40 }, { sex: 'F', min: 50 }] }),
  marker({ id: 'triglycerides', name: 'Triglycerides', category: 'LIPIDS', canonicalUnit: 'mg/dL', altUnits: [{ unit: 'mmol/L', toCanonical: 88.57 }], defaultRanges: [{ max: 150 }] }),
  marker({ id: 'non-hdl-cholesterol', name: 'Non-HDL Cholesterol', category: 'LIPIDS', canonicalUnit: 'mg/dL', altUnits: MMOL_CHOL, defaultRanges: [{ max: 130 }] }),
  marker({ id: 'fasting-glucose', name: 'Fasting Glucose', aliases: ['glucose'], category: 'GLUCOSE', canonicalUnit: 'mg/dL', altUnits: [{ unit: 'mmol/L', toCanonical: 18.0182 }], defaultRanges: [{ min: 70, max: 99 }] }),
  marker({ id: 'hba1c', name: 'HbA1c', aliases: ['a1c'], category: 'GLUCOSE', canonicalUnit: '%', defaultRanges: [{ min: 4, max: 5.6 }] }),
  marker({ id: 'tsh', name: 'TSH', aliases: ['thyrotropin'], category: 'THYROID', canonicalUnit: 'mIU/L', defaultRanges: [{ min: 0.4, max: 4 }] }),
];

export const PROFILE: Profile = { id: 'p1', name: 'Sam', sex: 'F' };

export const FREE: Entitlement = {
  plan: 'free',
  source: null,
  stripeActive: false,
  appStoreActive: false,
  appStoreStatus: null,
  appStoreAutoRenew: null,
  appStoreProductId: null,
  expiresAt: null,
  maxProfiles: 1,
  maxSessions: 20,
  profileCount: 1,
  sessionCount: 2,
};

export const PRO: Entitlement = {
  ...FREE,
  plan: 'pro',
  source: 'app_store',
  appStoreActive: true,
  appStoreStatus: 'active',
  appStoreAutoRenew: true,
  appStoreProductId: 'com.bbiom.app.pro.yearly',
  expiresAt: '2027-09-01T00:00:00Z',
  maxProfiles: 6,
  maxSessions: null,
};

function result(id: string, sessionId: string, sessionDate: string, biomarkerId: string, value: number, labName?: string): ResultWithSession {
  return { id, sessionId, sessionDate, biomarkerId, value, enteredUnit: CATALOG.find((b) => b.id === biomarkerId)!.canonicalUnit, labName };
}

export function freshDb() {
  return {
    profiles: [PROFILE] as Profile[],
    catalog: [...CATALOG],
    sessions: [
      { id: 's2', profileId: 'p1', date: '2026-09-01', labName: 'Labcorp', fasting: true },
      { id: 's1', profileId: 'p1', date: '2024-01-10', labName: 'Quest' },
    ] as TestSession[],
    results: [
      result('r1', 's1', '2024-01-10', 'ldl-cholesterol', 120, 'Quest'),
      result('r2', 's2', '2026-09-01', 'ldl-cholesterol', 130, 'Labcorp'),
      result('r3', 's2', '2026-09-01', 'fasting-glucose', 97, 'Labcorp'),
      result('r4', 's2', '2026-09-01', 'hba1c', 5.2, 'Labcorp'),
    ],
    events: [{ id: 'e1', profileId: 'p1', date: '2025-03-01', label: 'Started statin' }] as LifeEvent[],
    watched: [] as string[],
    customRanges: {} as Record<string, RefRange>,
    unitPrefs: {} as Record<string, string>,
    entitlement: FREE,
  };
}

export const db = freshDb();

export function resetDb() {
  Object.assign(db, freshDb());
}
