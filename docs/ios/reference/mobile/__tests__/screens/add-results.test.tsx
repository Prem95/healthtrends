import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import AddResults from '@/app/(app)/add-results';
import * as api from '@/lib/api';
import { todayISO } from '@/lib/format';

import { resetDb } from '../support/fixtures';
import { ApiError } from '../support/mock-api';
import { renderScreen } from '../support/render';

const createSession = api.createSession as unknown as jest.Mock<(input: unknown) => Promise<string>>;

/** Press the button with this label in the most recent system alert. */
async function pressAlertButton(label: string) {
  const calls = (Alert.alert as unknown as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as AlertButton[];
  const button = buttons.find((b) => b.text === label);
  if (!button) throw new Error(`No "${label}" in alert: ${buttons.map((b) => b.text).join(', ')}`);
  await act(async () => {
    button.onPress?.();
  });
}

function lastAlert() {
  const calls = (Alert.alert as unknown as jest.Mock).mock.calls;
  return calls[calls.length - 1] as [string, string, AlertButton[]];
}

describe('Add results', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('adds a panel, converts units and saves one atomic test', async () => {
    await renderScreen(<AddResults />);
    await fireEvent.press(await screen.findByLabelText('Add Lipid Panel'));

    // Five rows from the panel; the save button counts only typed values.
    expect(screen.getByText('LDL Cholesterol')).toBeOnTheScreen();
    expect(screen.getByText('Non-HDL Cholesterol')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lipid Panel, added')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('LDL Cholesterol value in mg/dL'), '94');
    await fireEvent.changeText(screen.getByLabelText('HDL Cholesterol value in mg/dL'), '1,4');
    // Rows in panel order: Total, LDL, HDL, … — switch HDL's unit to mmol/L.
    await fireEvent.press(screen.getAllByRole('radio', { name: 'mmol/L' })[2]);
    expect(screen.getByLabelText('HDL Cholesterol value in mmol/L')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 2 results' }));

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(Alert.alert).not.toHaveBeenCalled();
    const input = createSession.mock.calls[0][0] as {
      date: string;
      profileId: string;
      fasting: boolean;
      results: { biomarkerId: string; value: number; enteredUnit: string; labRange: unknown }[];
    };
    expect(input.profileId).toBe('p1');
    expect(input.date).toBe(todayISO());
    expect(input.fasting).toBe(false);
    expect(input.results).toEqual([
      { biomarkerId: 'ldl-cholesterol', value: 94, enteredUnit: 'mg/dL', labRange: null },
      { biomarkerId: 'hdl-cholesterol', value: expect.closeTo(1.4 * 38.67, 5), enteredUnit: 'mmol/L', labRange: null },
    ]);
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('questions a value in the wrong unit and switches it on request', async () => {
    await renderScreen(<AddResults />);
    await fireEvent.changeText(await screen.findByLabelText('Add a single marker'), 'ldl');
    await fireEvent.press(screen.getByRole('button', { name: /LDL Cholesterol/ }));
    await fireEvent.changeText(screen.getByLabelText('LDL Cholesterol value in mg/dL'), '2.4');
    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 1 result' }));

    const [title, message] = lastAlert();
    expect(title).toBe('Double-check this value');
    expect(message).toBe('LDL Cholesterol: 2.4 mg/dL looks unusual. Did you mean 2.4 mmol/L (= 92.8 mg/dL)?');
    expect(createSession).not.toHaveBeenCalled();

    await pressAlertButton('Use mmol/L');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    const input = createSession.mock.calls[0][0] as { results: { value: number; enteredUnit: string }[] };
    expect(input.results[0].enteredUnit).toBe('mmol/L');
    expect(input.results[0].value).toBeCloseTo(92.8, 1);
  });

  it('saves an extreme value once the person confirms it', async () => {
    await renderScreen(<AddResults />);
    await fireEvent.changeText(await screen.findByLabelText('Add a single marker'), 'glucose');
    await fireEvent.press(screen.getByRole('button', { name: /Fasting Glucose/ }));
    await fireEvent.changeText(screen.getByLabelText('Fasting Glucose value in mg/dL'), '2500');
    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 1 result' }));
    expect(lastAlert()[0]).toBe('Double-check this value');
    await pressAlertButton('The value is correct');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
  });

  it('warns once about a marker already recorded on that date', async () => {
    await renderScreen(<AddResults />);
    // The fixture already has HbA1c on 2026-09-01.
    await fireEvent.changeText(await screen.findByLabelText('Collection date'), '2026-09-01');
    await fireEvent.press(screen.getByLabelText('Add HbA1c'));
    await fireEvent.changeText(screen.getByLabelText('HbA1c value in %'), '5.3');
    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 1 result' }));

    const [title, message] = lastAlert();
    expect(title).toBe('Already recorded on this date');
    expect(message).toBe('HbA1c already has a value on this date. Saving will add a second entry.');
    expect(createSession).not.toHaveBeenCalled();
    await pressAlertButton('Save anyway');
    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect((createSession.mock.calls[0][0] as { date: string }).date).toBe('2026-09-01');
  });

  it('blocks saving while a value is not a number', async () => {
    await renderScreen(<AddResults />);
    await fireEvent.changeText(await screen.findByLabelText('Add a single marker'), 'tsh');
    await fireEvent.press(screen.getByRole('button', { name: /TSH/ }));
    await fireEvent.changeText(screen.getByLabelText('TSH value in mIU/L'), '1.2.3');
    expect(screen.getByText('Some values are not numbers yet.')).toBeOnTheScreen();
    expect(screen.getByText('Not a number yet.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save test' })).toBeDisabled();
  });

  it('explains the Free limit and offers Pro without losing the form', async () => {
    createSession.mockRejectedValueOnce(new ApiError('session_limit'));
    await renderScreen(<AddResults />);
    await fireEvent.changeText(await screen.findByLabelText('Add a single marker'), 'tsh');
    await fireEvent.press(screen.getByRole('button', { name: /TSH/ }));
    await fireEvent.changeText(screen.getByLabelText('TSH value in mIU/L'), '1.2');
    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 1 result' }));
    await waitFor(() => expect(lastAlert()[0]).toBe('The Free plan includes 20 tests'));
    await pressAlertButton('See Pro');
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.getByLabelText('TSH value in mIU/L').props.value).toBe('1.2');
  });

  it('keeps the form and says so when offline', async () => {
    createSession.mockRejectedValueOnce(new ApiError('request_failed'));
    await renderScreen(<AddResults />);
    await fireEvent.changeText(await screen.findByLabelText('Add a single marker'), 'tsh');
    await fireEvent.press(screen.getByRole('button', { name: /TSH/ }));
    await fireEvent.changeText(screen.getByLabelText('TSH value in mIU/L'), '1.2');
    await fireEvent.press(screen.getByRole('button', { name: 'Save test · 1 result' }));
    expect(await screen.findByText(/Not saved. You appear to be offline/)).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('walks the value fields with Next', async () => {
    await renderScreen(<AddResults />);
    await fireEvent.press(await screen.findByLabelText('Add Thyroid Panel'));
    expect(screen.queryByLabelText('Next value')).toBeNull();
    await fireEvent(screen.getByLabelText('TSH value in mIU/L'), 'focus');
    expect(screen.getByLabelText('Next value')).toBeOnTheScreen();
  });
});
