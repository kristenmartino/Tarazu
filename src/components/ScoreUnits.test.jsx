/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { ScoreUnits } from './ScoreUnits';

vi.mock('../ThemeProvider', () => ({ useC: () => ({}) }));
afterEach(cleanup);

it('keeps full long claim caveats available on demand and retains AI origin even after a human relabels it', () => {
  const text = `${'Forecast for the fictional pilot. '.repeat(8)}No real measurements; synthetic example only.`;
  const claim = { id: 'ai', dimension: 'impact', kind: 'estimate', origin: 'ai', text, sources: [] };
  const { container } = render(<ScoreUnits dimension="impact" value={55} basis={{ claims: [claim], basisClaimIds: { impact: 'ai' } }} />);
  expect(screen.getByText('Recorded basis · User estimate · Originally AI')).toBeTruthy();
  const details = container.querySelector('details');
  expect(details.open).toBe(false);
  expect(details.querySelector('summary').textContent).not.toContain('synthetic example only.');
  expect(screen.getByText(text).closest('details')).toBe(details);
  expect(screen.getByText(/Selecting a basis does not verify it/)).toBeTruthy();
});

it('uses a current exact band, showing user counts and person-days only in their definitions or claims', () => {
  const { rerender } = render(<ScoreUnits dimension="reach" value={55} />);
  expect(screen.getByText('Broad band')).toBeTruthy();
  expect(screen.getByText(/About 60% of the workspace audience/)).toBeTruthy();
  expect(screen.getByText(/No recorded basis selected/)).toBeTruthy();
  rerender(<ScoreUnits dimension="effort" value={35} />);
  expect(screen.getByText(/Over 1 and up to 3 person-days/)).toBeTruthy();
  rerender(<ScoreUnits dimension="effort" value={36} />);
  expect(screen.getByText('Custom score')).toBeTruthy();
  expect(screen.queryByText(/Over 1 and up to 3 person-days/)).toBeNull();
});
