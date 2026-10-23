/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, it, expect } from 'vitest';
import { AIContextDetails, referenceLabel } from './AIContextDetails';
import { buildScoringContext } from '../../lib/scoring-context';
afterEach(cleanup);
it('shows readable context and resolves reference names without raw JSON', () => {
  const context = buildScoringContext({ productContext: {constraints:'One engineer'}, candidateId:'a', featureName:'Bulk invite', signals:[{id:'signal-internal-123',linked_candidate_id:'a',title:'Admin interviews',body:'Admins struggled with invites'}] });
  const {container} = render(<AIContextDetails context={context} />);
  expect(screen.getByText('One engineer')).toBeTruthy();
  expect(screen.getByText('Admin interviews')).toBeTruthy();
  expect(container.querySelector('pre')).toBeNull();
  expect(container.textContent).not.toContain('signal-internal-123');
  expect(referenceLabel('signal:signal-internal-123',context)).toBe('Signal: Admin interviews');
  expect(referenceLabel('brief:constraints',context)).toBe('Strategy Brief: Constraints');
});
