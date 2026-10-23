import { z } from 'zod';

// Assessment completion is an application-owned fact. Keep it out of generated
// prose entirely, rather than trying to repair arithmetic in natural language.
// The context inspector renders each saved snapshot's exact counts separately.
const ASSESSMENT_LANGUAGE = /\b(?:assessments?|(?:un)?assessed|(?:un)?rated|unscored|dimensions?|criteria|criterion)\b/i;
const REPAIR = 'Do not narrate validation assessment dimensions, counts, or completion status. The app displays the exact saved-brief counts separately. Explain evidence, assumptions, risks, or the next action without assessment language.';

export function withAppOwnedAssessments(schema, sourceNames = []) {
  return schema.superRefine((result, ctx) => {
    function visit(value, path = []) {
      // Allow an exact copied candidate name, including in the proposed order.
      // A model-written completion claim in those fields must still be checked.
      if ((path.at(-1) === 'name' || path.at(-2) === 'sprintPlan') && sourceNames.includes(value)) return;
      if (typeof value === 'string' && ASSESSMENT_LANGUAGE.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: REPAIR });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, [...path, index]));
      } else if (value && typeof value === 'object') {
        // Reference IDs have their own allowlist validation in both routes.
        for (const [key, item] of Object.entries(value)) {
          if (!['evidence', 'claimId', 'claimIds'].includes(key)) visit(item, [...path, key]);
        }
      }
    }
    visit(result);
  });
}
