import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import MarkerDetail from '@/app/(app)/marker/[id]';
import * as api from '@/lib/api';

import { PROFILE, db, resetDb } from '../support/fixtures';
import { mocked, renderScreen } from '../support/render';

const params = useLocalSearchParams as unknown as jest.Mock;

async function pressAlertButton(label: string) {
  const calls = (Alert.alert as unknown as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as AlertButton[];
  await act(async () => {
    buttons.find((b) => b.text === label)!.onPress?.();
  });
}

describe('Marker detail', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    params.mockReturnValue({ id: 'ldl-cholesterol' });
  });

  it('shows the marker, its history and the range in use', async () => {
    await renderScreen(<MarkerDetail />);
    expect(await screen.findByRole('header', { name: 'LDL Cholesterol' })).toBeOnTheScreen();
    expect(screen.getByLabelText('1 Sep 2026, 130 mg/dL')).toBeOnTheScreen();
    expect(screen.getByLabelText('10 Jan 2024, 120 mg/dL')).toBeOnTheScreen();
    expect(screen.getByText('under 100 mg/dL')).toBeOnTheScreen();
  });

  it('deletes a result after a long press and a confirmation', async () => {
    await renderScreen(<MarkerDetail />);
    await fireEvent(await screen.findByLabelText('10 Jan 2024, 120 mg/dL'), 'longPress');
    expect((Alert.alert as unknown as jest.Mock).mock.calls[0][0]).toBe('Delete this result?');
    await pressAlertButton('Delete');
    await waitFor(() => expect(mocked(api.deleteResult)).toHaveBeenCalledWith('r1', expect.anything()));
  });

  it('offers the same delete to VoiceOver as an action', async () => {
    await renderScreen(<MarkerDetail />);
    const row = await screen.findByLabelText('1 Sep 2026, 130 mg/dL');
    expect(row.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Delete this result' }]);
  });

  it('saves your own range in the canonical unit', async () => {
    db.unitPrefs = { 'ldl-cholesterol': 'mmol/L' };
    await renderScreen(<MarkerDetail />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Set your own range' }));
    await fireEvent.changeText(screen.getByLabelText('Maximum'), '2,5');
    await fireEvent.press(screen.getByRole('button', { name: 'Save range' }));
    await waitFor(() => expect(mocked(api.setCustomRange)).toHaveBeenCalledTimes(1));
    const [profileId, biomarkerId, range] = (api.setCustomRange as unknown as jest.Mock).mock.calls[0] as [string, string, { max: number }];
    expect(profileId).toBe('p1');
    expect(biomarkerId).toBe('ldl-cholesterol');
    expect(range.max).toBeCloseTo(2.5 * 38.67, 5);
  });

  it('refuses a minimum above the maximum', async () => {
    await renderScreen(<MarkerDetail />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Set your own range' }));
    await fireEvent.changeText(screen.getByLabelText('Minimum'), '120');
    await fireEvent.changeText(screen.getByLabelText('Maximum'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Save range' }));
    expect(screen.getByText('The minimum must be less than or equal to the maximum.')).toBeOnTheScreen();
    expect(mocked(api.setCustomRange)).not.toHaveBeenCalled();
  });

  it('explains a sex-specific range when sex is not given', async () => {
    db.profiles = [{ ...PROFILE, sex: 'OTHER' }];
    params.mockReturnValue({ id: 'hdl-cholesterol' });
    await renderScreen(<MarkerDetail />);
    expect(await screen.findByText('No results recorded for HDL Cholesterol yet.')).toBeOnTheScreen();
    expect(screen.getByText(/differs by sex/)).toBeOnTheScreen();
  });
});
