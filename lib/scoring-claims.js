export const CLAIM_KINDS = { unclassified: 'Unclassified', fact: 'Reported fact', estimate: 'User estimate', ai_assumption: 'AI assumption' };
export const CLAIM_DIMENSIONS = ['reach', 'impact', 'confidence', 'effort'];
export const MAX_CLAIMS = 12;

const bounded = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
export function normalizeClaims(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(c => c && typeof c.id === 'string' && c.id && !seen.has(c.id) && seen.add(c.id)).slice(0, MAX_CLAIMS).map(c => ({
    id: bounded(c.id, 100), dimension: CLAIM_DIMENSIONS.includes(c.dimension) ? c.dimension : 'reach',
    text: bounded(c.text, 700), kind: Object.hasOwn(CLAIM_KINDS, c.kind) ? c.kind : 'unclassified',
    origin: c.origin === 'ai' ? 'ai' : 'user', question: bounded(c.question, 400),
    sources: (Array.isArray(c.sources) ? c.sources : []).filter(s => s && typeof s.signalId === 'string').slice(0, 3).map(s => ({
      signalId: bounded(s.signalId, 100), relation: ['supports', 'conflicts', 'context'].includes(s.relation) ? s.relation : 'context', quote: bounded(s.quote, 700),
    })),
  }));
}

// A matching excerpt establishes provenance, not whether a source proves a claim.
export function sourceStatus(source, signals) {
  const signal = signals.find(s => s.id === source.signalId);
  if (!signal) return 'Source unavailable';
  if (!source.quote?.trim()) return 'Source linked · no excerpt';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  return clean(signal.body).includes(clean(source.quote)) ? 'Excerpt matches source' : 'Excerpt not found in source';
}

export function relevantClaims(context, dimension) {
  return (context.candidate?.scoringBasis?.claims || []).filter(c => c.dimension === dimension || (dimension === 'confidence' && ['reach', 'impact'].includes(c.dimension)));
}
