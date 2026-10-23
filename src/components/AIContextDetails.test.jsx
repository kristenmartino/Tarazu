/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
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
it('shows application-calculated counts outside the collapsed context inspector', () => {
  const context = buildScoringContext({candidateId:'a',decisions:[{
    id:'d',chosen_candidate_id:'a',title:'Investigate first',status:'draft',
    recommendation_snapshot:{validation_brief:{draft:{scores:{problemSeverity:4,evidenceStrength:2,buildFeasibility:4,strategicFit:4}}}},
  }]});
  render(<AIContextDetails context={context} />);
  const counts = screen.getByText('Recorded assessment: 4/7 dimensions assessed; 3 not assessed.');
  expect(counts.closest('details')).toBeNull();
  expect(screen.getByRole('region', {name:'Saved validation assessments'}).contains(counts)).toBe(true);
});

it('keeps counts specific to each saved snapshot, including empty and complete briefs', () => {
  const scores = {problemSeverity:4,evidenceStrength:2,marketPull:3,differentiation:1,monetizationClarity:2,buildFeasibility:4,strategicFit:2};
  const context = buildScoringContext({candidateId:'a',decisions:[
    {id:'empty',chosen_candidate_id:'a',title:'Empty draft',recommendation_snapshot:{validation_brief:{draft:{scores:{}}}}},
    {id:'complete',chosen_candidate_id:'a',title:'Complete draft',recommendation_snapshot:{validation_brief:{draft:{scores}}}},
  ]});
  render(<AIContextDetails context={context} />);
  const facts = within(screen.getByRole('region', {name:'Saved validation assessments'}));
  expect(facts.getByText('Empty draft').closest('li').textContent).toContain('0/7 dimensions assessed; 7 not assessed.');
  expect(facts.getByText('Complete draft').closest('li').textContent).toContain('7/7 dimensions assessed; 0 not assessed.');
});
