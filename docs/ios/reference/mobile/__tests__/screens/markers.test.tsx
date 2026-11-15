import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';

import Markers from '@/app/(app)/(tabs)/markers';

import { resetDb } from '../support/fixtures';
import { renderScreen } from '../support/render';

describe('Markers', () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
  });

  it('lists markers with results by body system, most-ordered first', async () => {
    await renderScreen(<Markers />);
    expect(await screen.findByText('LDL Cholesterol')).toBeOnTheScreen();
    expect(screen.getByText('Fasting Glucose')).toBeOnTheScreen();
    expect(screen.getByText('HbA1c')).toBeOnTheScreen();
    expect(screen.queryByText('TSH')).toBeNull(); // no results, not in this scope
    // Glucose & Metabolic comes before Lipids
    const headers = screen.getAllByRole('header').map((h) => String(h.props.children?.[0] ?? h.props.children));
    expect(headers.indexOf('Glucose & Metabolic')).toBeLessThan(headers.indexOf('Lipids'));
  });

  it('finds a marker by its abbreviation', async () => {
    await renderScreen(<Markers />);
    await fireEvent.changeText(await screen.findByLabelText('Search markers'), 'a1c');
    expect(screen.getByText('HbA1c')).toBeOnTheScreen();
    expect(screen.queryByText('LDL Cholesterol')).toBeNull();
  });

  it('shows the whole catalog, with rows that have no results yet', async () => {
    await renderScreen(<Markers />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Whole catalog' }));
    expect(screen.getByText('TSH')).toBeOnTheScreen();
    expect(screen.getAllByText('No results yet').length).toBeGreaterThan(0);
  });

  it('narrows to what is worth a look', async () => {
    await renderScreen(<Markers />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Worth a look' }));
    expect(screen.getByText('LDL Cholesterol')).toBeOnTheScreen(); // 130, above 100
    expect(screen.queryByText('TSH')).toBeNull();
  });

  it('says so plainly when nothing matches', async () => {
    await renderScreen(<Markers />);
    await fireEvent.changeText(await screen.findByLabelText('Search markers'), 'zzz');
    expect(screen.getByText('No markers match. Try the whole catalog or a different spelling.')).toBeOnTheScreen();
  });
});
