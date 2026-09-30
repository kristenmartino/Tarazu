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
  fireEvent.change(screen.getByRole('textbox', { name: 'PRODUCT SUMMARY' }), {target:{value:'Product'}});
  expect(onChange).toHaveBeenCalledTimes(1);
  unmount();
  vi.advanceTimersByTime(1000);
  expect(onChange).toHaveBeenCalledTimes(1);
});
