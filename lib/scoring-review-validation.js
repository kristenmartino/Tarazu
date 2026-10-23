import { z } from 'zod';
import { SCORING_ANCHORS } from './scoring-basis';
import { relevantClaims } from './scoring-claims';
import { withAppOwnedAssessments } from './ai-assessment-guard';

export function scoringResponseSchema(dimensions, refs, context) {
  const sourceRefs = context.evidence.map(s => `signal:${s.id}`);
  const referenceList = allowed => z.array(z.string()).max(12).refine(values => values.every(v => allowed.includes(v)), 'Unknown evidence reference');
  const resultFor = dimension => {
    const claims = relevantClaims(context, dimension);
    const ids = claims.map(c => c.id);
    return z.object({
      score: z.number().int().nullable().refine(value => value === null || SCORING_ANCHORS[dimension].some(a => a.pos === value), `Use a shared anchor score: ${SCORING_ANCHORS[dimension].map(a => a.pos).join(', ')}, or null when unknown`),
      justification: z.string().min(1).max(1000), evidence: referenceList(refs),
      assumptions: z.array(z.string().max(500)).max(8), gaps: z.array(z.string().max(500)).max(8), nextAction: z.string().min(1).max(500),
      claimReviews: z.array(z.object({
        claimId: z.string(), status: z.enum(['supported', 'conflicting', 'source_missing', 'assumption', 'needs_review']),
        explanation: z.string().min(1).max(400), evidence: referenceList(sourceRefs),
      })).max(12),
      followUp: z.object({ question: z.string().min(1).max(400), whyItChangesScore: z.string().min(1).max(500), claimIds: z.array(z.string()).max(12).refine(values => values.every(id => ids.includes(id)), 'Unknown follow-up claim') }).nullable(),
    }).superRefine((result, ctx) => {
      const issue = (path, message) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
      if (result.score === null && !result.followUp) issue(['followUp'], 'An unknown score requires a targeted follow-up question and why its answer changes the score');
      const reviewedIds = result.claimReviews.map(r => r.claimId);
      if (new Set(reviewedIds).size !== reviewedIds.length || reviewedIds.length !== ids.length || reviewedIds.some(id => !ids.includes(id))) {
        issue(['claimReviews'], `Review exactly these claimIds once each for ${dimension}: ${JSON.stringify(ids)}. Missing: ${JSON.stringify(ids.filter(id => !reviewedIds.includes(id)))}. Unexpected: ${JSON.stringify(reviewedIds.filter(id => !ids.includes(id)))}. For confidence, include the listed reach and impact claims again even if reviewed under another response key.`);
      }
      result.claimReviews.forEach((review, index) => {
        const claim = claims.find(c => c.id === review.claimId);
        if (!claim) return;
        if (claim.kind === 'ai_assumption' && review.status !== 'assumption') issue(['claimReviews', index, 'status'], 'AI assumptions remain assumption; never promote them to supported facts');
        if (review.status === 'supported') {
          const support = claim.sources.filter(s => s.relation === 'supports' && ['Excerpt matches source', 'Source linked · no excerpt'].includes(s.status));
          if (claim.kind === 'unclassified' || !support.some(s => review.evidence.includes(`signal:${s.signalId}`))) issue(['claimReviews', index], 'Supported requires a classified claim and a cited, available attached supporting source with no excerpt mismatch');
        }
      });
    });
  };
  return withAppOwnedAssessments(z.object(Object.fromEntries(dimensions.map(d => [d, resultFor(d)]))));
}
