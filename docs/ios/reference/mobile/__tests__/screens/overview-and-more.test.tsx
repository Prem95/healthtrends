import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import Onboarding from '@/app/(app)/onboarding';
import Overview from '@/app/(app)/(tabs)/index';
import Paywall from '@/app/(app)/paywall';
import * as api from '@/lib/api';

import { db, resetDb } from '../support/fixtures';
import { purchases } from '../support/purchases';
import { mocked, renderScreen } from '../support/render';

describe('Overview', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
  });

  it('answers "how am I doing?" first, then what needs a look', async () => {
    await renderScreen(<Overview />);
    expect(await screen.findByLabelText(/of 3 markers in range/)).toBeOnTheScreen();
    expect(screen.getByText(/^Worth a closer look/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^LDL Cholesterol, 130/)).toBeOnTheScreen();
  });

  it('starts an empty record with a way to add results', async () => {
    db.sessions = [];
    db.results = [];
    await renderScreen(<Overview />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add your first results' }));
    expect(router.push).toHaveBeenCalledWith('/add-results');
  });
});

describe('Onboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the first profile', async () => {
    await renderScreen(<Onboarding />);
    await fireEvent.changeText(screen.getByLabelText('Profile name'), 'Me');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mocked(api.createProfile)).toHaveBeenCalledWith({ name: 'Me', sex: 'OTHER' }, expect.anything()));
  });
});

describe('Paywall', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
    purchases.products = [];
  });

  it('shows App Store prices, the renewal terms and restore', async () => {
    purchases.products = [
      { id: 'com.bbiom.app.pro.monthly', displayPrice: '$4.99' },
      { id: 'com.bbiom.app.pro.yearly', displayPrice: '$39.99' },
    ];
    await renderScreen(<Paywall />);
    expect(await screen.findByText('$39.99 / year')).toBeOnTheScreen();
    expect(screen.getByText('$4.99 / month')).toBeOnTheScreen();
    expect(screen.getByText(/renews automatically/)).toBeOnTheScreen();
    expect(screen.getByText('Restore purchases')).toBeOnTheScreen();
    expect(screen.getByText('Privacy policy')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Subscribe' }));
    expect(purchases.buy).toHaveBeenCalledWith('com.bbiom.app.pro.yearly');
  });

  it('never offers a second subscription to someone on Pro through the website', async () => {
    db.entitlement = { ...db.entitlement, plan: 'pro', source: 'stripe', stripeActive: true };
    await renderScreen(<Paywall />);
    expect(await screen.findByText(/You are on Pro through the bbiom website/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull();
  });

  it('cannot be bought before the App Store has answered', async () => {
    await renderScreen(<Paywall />);
    expect(await screen.findByText('Plans are not available right now. Please try again shortly.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDisabled();
  });
});
