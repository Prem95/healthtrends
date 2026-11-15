import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import Settings from '@/app/(app)/(tabs)/settings';
import * as api from '@/lib/api';
import { PRIVACY_URL } from '@/lib/links';

import { PRO, db, resetDb } from '../support/fixtures';
import { mocked, renderScreen } from '../support/render';

describe('Settings', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
  });

  it('on Free: one profile, the limit in words, the summary behind Pro', async () => {
    await renderScreen(<Settings />);
    expect(await screen.findByText('Free')).toBeOnTheScreen();
    expect(screen.getByText('1 profile · 2 of 20 tests used · export always included.')).toBeOnTheScreen();
    expect(screen.getByText('Sam')).toBeOnTheScreen();
    expect(screen.getByText('The Free plan includes one profile. Pro adds up to six.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Doctor summary, a Pro feature' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
  });

  it('on Pro: adds a family member and opens the summary', async () => {
    db.entitlement = PRO;
    await renderScreen(<Settings />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a family member' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Mum');
    await fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocked(api.createProfile)).toHaveBeenCalledTimes(1));
    expect((api.createProfile as unknown as jest.Mock).mock.calls[0][0]).toEqual({ name: 'Mum', sex: 'F', dateOfBirth: undefined });

    await fireEvent.press(screen.getByRole('button', { name: 'Doctor summary' }));
    expect(router.push).toHaveBeenCalledWith('/summary');
  });

  it('edits a profile', async () => {
    await renderScreen(<Settings />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Sam/ }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Samantha');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mocked(api.updateProfile)).toHaveBeenCalledWith('p1', { name: 'Samantha', sex: 'F', dateOfBirth: undefined }),
    );
  });

  it('creates a custom marker with its range', async () => {
    await renderScreen(<Settings />);
    await fireEvent.press(await screen.findByRole('button', { name: 'New custom marker' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Lipoprotein(a)');
    await fireEvent.changeText(screen.getByLabelText('Unit'), 'nmol/L');
    await fireEvent.press(screen.getByRole('radio', { name: 'Lipids' }));
    await fireEvent.changeText(screen.getByLabelText('Range maximum'), '75');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocked(api.createCustomBiomarker)).toHaveBeenCalledTimes(1));
    expect((api.createCustomBiomarker as unknown as jest.Mock).mock.calls[0][0]).toEqual({
      name: 'Lipoprotein(a)',
      unit: 'nmol/L',
      category: 'LIPIDS',
      range: { max: 75 },
    });
  });

  it('links to the privacy policy in the app', async () => {
    await renderScreen(<Settings />);
    await fireEvent.press(await screen.findByRole('link', { name: 'Privacy policy' }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PRIVACY_URL);
  });
});
