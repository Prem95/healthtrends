import { jest } from '@jest/globals';

import { db } from './fixtures';

/* Stands in for src/lib/api.ts: reads come from the fixture db, writes are spies. */

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

export const listProfiles = jest.fn(async () => db.profiles);
export const getBiomarkers = jest.fn(async () => db.catalog);
export const getSessions = jest.fn(async (_profileId: string) => db.sessions);
export const getResults = jest.fn(async (_profileId: string) => db.results);
export const getLifeEvents = jest.fn(async (_profileId: string) => db.events);
export const getWatched = jest.fn(async (_profileId: string) => db.watched);
export const getCustomRanges = jest.fn(async (_profileId: string) => db.customRanges);
export const getUnitPreferences = jest.fn(async () => db.unitPrefs);
export const getEntitlement = jest.fn(async () => db.entitlement);

export const createProfile = jest.fn(async (_input: unknown) => 'p-new');
export const updateProfile = jest.fn(async (_id: string, _input: unknown) => undefined);
export const createSession = jest.fn(async (_input: unknown) => 's-new');
export const deleteSession = jest.fn(async (_id: string) => undefined);
export const deleteResult = jest.fn(async (_id: string) => undefined);
export const addLifeEvent = jest.fn(async (_input: unknown) => undefined);
export const deleteLifeEvent = jest.fn(async (_id: string) => undefined);
export const setWatched = jest.fn(async (_p: string, _b: string, _w: boolean) => undefined);
export const setDisplayUnit = jest.fn(async (_b: unknown, _u: string) => undefined);
export const setCustomRange = jest.fn(async (_p: string, _b: string, _r: unknown) => undefined);
export const createCustomBiomarker = jest.fn(async (_input: unknown) => 'custom-new');
export const removeCustomBiomarker = jest.fn(async (_id: string) => 'deleted' as const);
