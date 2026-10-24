import { normalizeCandidateBasis, scoringRubric } from './scoring-basis';

// Manual values remain exact: a score between anchors has no assigned band.
export function scoreBand(dimension, value, settings) {
  return scoringRubric(settings)[dimension]?.find(anchor => anchor.pos === value) || null;
}

export function selectedBasisClaim(dimension, basis) {
  const normalized = normalizeCandidateBasis(basis);
  return normalized.claims.find(claim => claim.id === normalized.basisClaimIds[dimension] && claim.dimension === dimension) || null;
}
