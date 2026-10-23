import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { withAppOwnedAssessments } from './ai-assessment-guard';

const schema = withAppOwnedAssessments(z.object({
  justification: z.string(),
  assumptions: z.array(z.string()).optional(),
  gaps: z.array(z.string()).optional(),
  nextAction: z.string().optional(),
  pick: z.object({ name: z.string(), reason: z.string() }).optional(),
  evidence: z.array(z.string()).optional(),
  sprintPlan: z.array(z.string()).optional(),
}), ['Assessment dashboard']);

describe('application-owned validation assessment facts', () => {
  it.each([
    'Decision 8cbf2215 is a draft with 4 of 7 dimensions unassessed and explicitly defers commitment.',
    'The draft decision notes four of seven opportunity dimensions remain unassessed, leaving evidence strength low.',
    'Three of seven dimensions are unassessed.',
    '4/7 assessed; 3 not assessed.',
    'Four criteria remain unknown.',
    'The assessment is complete.',
    'Only four were rated.',
    'Three remain unscored.',
  ])('rejects assessment narration, including correct counts: %s', justification => {
    expect(schema.safeParse({ justification }).success).toBe(false);
  });

  it.each(['assumptions', 'gaps', 'nextAction'])('guards %s, not just the justification', key => {
    const value = key === 'nextAction' ? 'Finish the three unrated criteria.' : ['Finish the three unrated criteria.'];
    const result = schema.safeParse({ justification: 'Evidence is synthetic.', [key]: value });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(key === 'nextAction' ? [key] : [key, 0]);
    expect(result.error.issues[0].message).toContain('The app displays the exact saved-brief counts separately');
  });

  it('guards nested advisor reasons while allowing copied names and reference IDs', () => {
    const value = { justification: 'Evidence is synthetic.', pick: { name: 'Assessment dashboard', reason: '4 of 7 dimensions are incomplete.' }, evidence: ['decision:assessment-4'], sprintPlan: ['Assessment dashboard'] };
    expect(schema.safeParse(value).error.issues[0].path).toEqual(['pick', 'reason']);
    value.pick.reason = 'Compare reminders with readiness before building.';
    expect(schema.safeParse(value).success).toBe(true);
  });

  it('keeps legitimate evidence numbers, estimates, and qualitative gaps', () => {
    const value = {
      justification: '6 of 8 invented administrators chased requests; 4 of 5 cases lacked context. This is not measured adoption.',
      assumptions: ['Approximately 100 weekly active users across 10 hypothetical teams.'],
      gaps: ['No willingness-to-pay evidence; differentiation remains unknown.'],
      nextAction: 'Test a paper checklist with 5 requesters before the two-week build.',
    };
    expect(schema.parse(value)).toEqual(value);
  });

  it('does not exempt model-written claims in name or sequence fields', () => {
    expect(schema.safeParse({justification:'Synthetic evidence.', pick:{name:'Four dimensions are unassessed',reason:'Check the cause.'}}).success).toBe(false);
    expect(schema.safeParse({justification:'Synthetic evidence.', sprintPlan:['Four dimensions are unassessed']}).success).toBe(false);
  });

  it('leaves claim reference IDs to their allowlists while guarding review and follow-up prose', () => {
    const review = withAppOwnedAssessments(z.object({ claimReviews: z.array(z.object({claimId:z.string(),explanation:z.string()})), followUp:z.object({claimIds:z.array(z.string()),question:z.string()}) }));
    const value = {claimReviews:[{claimId:'assessment-source',explanation:'Source does not establish uptake.'}],followUp:{claimIds:['dimension-source'],question:'How many accounts are eligible?'}};
    expect(review.safeParse(value).success).toBe(true);
    value.followUp.question = 'Are all dimensions assessed?';
    expect(review.safeParse(value).success).toBe(false);
  });
});
