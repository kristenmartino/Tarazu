import { SAMPLES } from "./theme";

// Sample loading must never replace work, even when invoked outside onboarding.
export function sampleBacklogFor(features) {
  if (features.length > 0) return null;
  return SAMPLES.map(feature => ({
    ...feature,
    description: `Fictional example — these estimates are illustrative, not customer evidence. ${feature.description || ""}`,
  }));
}
