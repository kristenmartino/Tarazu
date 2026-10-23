import { describe, it, expect } from 'vitest';
import { buildScoringContext, contextReferences, BRIEF_FIELDS } from './scoring-context';
describe('bounded workspace AI context', () => {
  it('includes each field independently without summary', () => {
    const productContext = Object.fromEntries(Object.keys(BRIEF_FIELDS).map(k => [k, k === 'productSummary' ? '' : k]));
    const c = buildScoringContext({ productContext });
    expect(c.missing).toEqual(['productSummary']);
    expect(c.brief.constraints).toBe('constraints');
    expect(c.brief.successMetrics).toBe('successMetrics');
  });
  it('includes only explicitly linked current-workspace evidence and decisions', () => {
    const c = buildScoringContext({ workspaceId: 'w', candidateId: 'a', signals: [
      { id: 'support', linked_candidate_id: 'a', confidence_impact: 'increases', workspace_id: 'w' },
      { id: 'conflict', linked_candidate_id: 'a', confidence_impact: 'decreases' },
      { id: 'other', linked_candidate_id: 'b' }, { id: 'foreign', linked_candidate_id: 'a', workspace_id: 'other' },
    ], decisions: [{ id: 'd', chosen_candidate_id: 'a', expected_outcome: 'hypothesis' }] });
    expect(c.evidence.map(x => x.id)).toEqual(['support', 'conflict']);
    expect(c.evidence[1].direction).toBe('decreases');
    expect(contextReferences(c)).toContain('decision:d');
  });
  it('does not attach backlog evidence to an unsaved candidate', () => {
    const c = buildScoringContext({ featureName: 'new', signals: [{ id: 's', linked_candidate_id: 'a' }], features: [{ id: 'a' }] });
    expect(c.evidence).toEqual([]);
  });
  it('excludes the saved target from competing options during edits', () => {
    const c = buildScoringContext({ candidateId: 'a', featureName: 'Edited name', features: [{ id: 'a', name: 'Old name' }, { id: 'b', name: 'Other' }] });
    expect(c.candidates.map(x => x.id)).toEqual(['b']);
    expect(c.candidate.name).toBe('Edited name');
    expect(contextReferences(c).filter(x => x === 'candidate:a')).toHaveLength(1);
  });
  it('bounds context and discloses omissions', () => {
    const c = buildScoringContext({ features: Array.from({length: 65}, (_,i) => ({id: String(i)})), productContext: { constraints: 'a'.repeat(1000) } });
    expect(c.candidates).toHaveLength(60); expect(c.brief.constraints).toHaveLength(700); expect(c.omissions.length).toBe(2);
  });
  it('supplies exact assessment counts from the saved snapshot instead of recounting prose', () => {
    const c = buildScoringContext({ candidateId: 'a', decisions: [{
      id: 'd', chosen_candidate_id: 'a', status: 'draft',
      final_rationale: 'An unreliable prose summary says four dimensions are unassessed.',
      recommendation_snapshot: { validation_brief: { draft: { evidenceReviewed: true, scores: {
        problemSeverity: 4, evidenceStrength: 2, marketPull: null, differentiation: null,
        monetizationClarity: null, buildFeasibility: 4, strategicFit: 4,
      } } } },
    }, { id: 'legacy', chosen_candidate_id: 'a' }] });
    expect(c.decisions[0].validationAssessment).toEqual({ assessedCount: 4, unassessedCount: 3, totalDimensions: 7, evidenceReviewed: true });
    expect(c.decisions[0].status).toBe('draft');
    expect(c.decisions[1].validationAssessment).toBeNull();
  });
});
