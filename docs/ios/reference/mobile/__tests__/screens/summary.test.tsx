import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';

import DoctorSummary from '@/app/(app)/summary';

import { PRO, db, resetDb } from '../support/fixtures';
import { renderScreen } from '../support/render';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(async () => ({ uri: 'file:///cache/summary.pdf' })) }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ exists: true, delete: mockDelete })),
}));

describe('Doctor summary', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
  });

  it('sends a Free account to the paywall', async () => {
    await renderScreen(<DoctorSummary />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/paywall'));
  });

  it('flags what to discuss and shares a PDF made on the phone', async () => {
    db.entitlement = PRO;
    await renderScreen(<DoctorSummary />);
    expect(await screen.findByText('Sam’s results, on one page')).toBeOnTheScreen();
    expect(screen.getByText(/Flagged for discussion/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByText(/all recorded history/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Share or print' }));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/summary.pdf', expect.objectContaining({ mimeType: 'application/pdf' })));
    const html = ((Print.printToFileAsync as unknown as jest.Mock).mock.calls[0][0] as { html: string }).html;
    expect(html).toContain('Sam’s results, on one page');
    expect(html).toContain('LDL Cholesterol');
    expect(mockDelete).toHaveBeenCalled(); // the PDF does not linger on the phone
  });
});
