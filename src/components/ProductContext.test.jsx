/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { ProductContext } from './ProductContext';
vi.mock('../ThemeProvider', () => ({useC: () => ({})}));
afterEach(() => {cleanup(); vi.useRealTimers();});
it('updates immediately once and never writes an old brief after unmount', () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  const {unmount} = render(<ProductContext context={{constraints:'One engineer'}} onChange={onChange} />);
  fireEvent.click(screen.getByText('STRATEGY BRIEF'));
  fireEvent.change(screen.getByRole('textbox', { name: 'PRODUCT SUMMARY' }), {target:{value:'Product'}});
  expect(onChange).toHaveBeenCalledTimes(1);
  unmount();
  vi.advanceTimersByTime(1000);
  expect(onChange).toHaveBeenCalledTimes(1);
});

it('updates shared anchors without replacing the brief or counting settings as a seventh brief field', () => {
  const onChange = vi.fn();
  render(<ProductContext context={{constraints:'One engineer', scoring:{timeframe:'90 days'}}} onChange={onChange} />);
  expect(screen.getByText('1/6 FIELDS')).toBeTruthy();
  fireEvent.click(screen.getByText('STRATEGY BRIEF'));
  fireEvent.click(screen.getByText('Shared score definitions'));
  expect(screen.getByLabelText('Scoring timeframe').value).toBe('90 days');
  fireEvent.change(screen.getByLabelText('Audience unit and size'), {target:{value:'100 accounts'}});
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({constraints:'One engineer', scoring:expect.objectContaining({timeframe:'90 days', audience:'100 accounts'})}));
  fireEvent.click(screen.getByText('Impact and effort · view or customize'));
  fireEvent.change(screen.getByLabelText('Effort 35 · S'), {target:{value:'Up to five person-days'}});
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({scoring:expect.objectContaining({effortBands:expect.objectContaining({35:'Up to five person-days'})})}));
});
