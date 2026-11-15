import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import Timeline from '@/app/(app)/(tabs)/timeline';
import * as api from '@/lib/api';
import { todayISO } from '@/lib/format';

import { db, resetDb } from '../support/fixtures';
import { mocked, renderScreen } from '../support/render';

async function pressAlertButton(label: string) {
  const calls = (Alert.alert as unknown as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as AlertButton[];
  await act(async () => {
    buttons.find((b) => b.text === label)!.onPress?.();
  });
}

describe('Timeline', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows tests and life events newest first, grouped by year, newest test open', async () => {
    await renderScreen(<Timeline />);
    expect(await screen.findByText('Sam · 2 tests · 1 life event')).toBeOnTheScreen();
    const years = ['2026', '2025', '2024'].map((y) => screen.getByRole('header', { name: y }));
    expect(years).toHaveLength(3);
    expect(screen.getByText('Started statin')).toBeOnTheScreen();
    // The 2026 test is open: its results are listed, flagged first.
    expect(screen.getByRole('button', { name: 'LDL Cholesterol, 130 mg/dL' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'LDL Cholesterol, 120 mg/dL' })).toBeNull();
  });

  it('opens one test at a time', async () => {
    await renderScreen(<Timeline />);
    await fireEvent.press(await screen.findByRole('button', { name: /^Test on 10 Jan 2024/ }));
    expect(screen.getByRole('button', { name: 'LDL Cholesterol, 120 mg/dL' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'LDL Cholesterol, 130 mg/dL' })).toBeNull();
  });

  it('deletes a test only after confirmation', async () => {
    await renderScreen(<Timeline />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete this test and its 3 results' }));
    expect(mocked(api.deleteSession)).not.toHaveBeenCalled();
    expect((Alert.alert as unknown as jest.Mock).mock.calls[0][0]).toBe('Delete this test and its 3 results?');
    await pressAlertButton('Delete');
    await waitFor(() => expect(mocked(api.deleteSession)).toHaveBeenCalledWith('s2', expect.anything()));
  });

  it('adds and removes a life event', async () => {
    await renderScreen(<Timeline />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a life event' }));
    await fireEvent.changeText(screen.getByLabelText('What happened'), 'Started vitamin D 2000 IU');
    await fireEvent.press(screen.getByRole('button', { name: 'Add event' }));
    await waitFor(() =>
      expect(mocked(api.addLifeEvent)).toHaveBeenCalledWith(
        { profileId: 'p1', date: todayISO(), label: 'Started vitamin D 2000 IU' },
        expect.anything(),
      ),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Remove life event Started statin' }));
    await pressAlertButton('Remove');
    await waitFor(() => expect(mocked(api.deleteLifeEvent)).toHaveBeenCalledWith('e1', expect.anything()));
  });

  it('has an empty state that leads to adding results', async () => {
    db.sessions = [];
    db.results = [];
    db.events = [];
    await renderScreen(<Timeline />);
    expect(await screen.findByText('Nothing here yet. Your first test will appear as soon as you add it.')).toBeOnTheScreen();
  });
});
