import { ASSUMPTION_CATEGORIES, VALIDATE_DIMENSIONS } from "../src/validate/validationScore";
const object = value => value && typeof value === "object" && !Array.isArray(value);

export const sameRecordedText = (a, b) => typeof a === "string" && typeof b === "string" && Boolean(a.trim()) && a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();

// Recognise only unchanged generated copies. Unknown/edited text stays visible.
export function isGeneratedBriefText(text, decision) {
  const snapshot=decision.recommendation_snapshot;
  const draft=snapshot?.validation_brief?.draft;
  if(!object(draft) || !object(draft.assumptions) || !object(draft.scores)
    || typeof snapshot.recommendation!=="string" || typeof snapshot.reason!=="string"
    || !Number.isInteger(snapshot.assessedCount) || snapshot.assessedCount<0 || snapshot.assessedCount>VALIDATE_DIMENSIONS.length
    || (snapshot.average!=null && (typeof snapshot.average!=="number" || !Number.isFinite(snapshot.average)))
    || ![draft.ideaName,draft.ideaDesc,draft.risks,draft.nextActions].every(v=>typeof v==="string")
    || ASSUMPTION_CATEGORIES.some(c=>draft.assumptions[c.key]!==undefined&&typeof draft.assumptions[c.key]!=="string")
    || typeof draft.evidenceReviewed!=="boolean" || VALIDATE_DIMENSIONS.some(d=>draft.scores[d.key]!==null&&(!Number.isInteger(draft.scores[d.key])||draft.scores[d.key]<1||draft.scores[d.key]>5))
    || !Array.isArray(draft.attachedSignals) || draft.attachedSignals.some(s=>!object(s)||![s.title,s.body,s.source,s.confidence_impact].every(v=>typeof v==="string"))) return false;
  const average=snapshot.average;
  const scoreSummary=`${snapshot.recommendation} — ${snapshot.assessedCount}/${VALIDATE_DIMENSIONS.length} dimensions assessed${average==null?"":`; average ${average.toFixed(1)}/5`}. ${snapshot.reason}`;
  const lines=[`Idea: ${draft.ideaName || "(unnamed)"}`];
  if(draft.ideaDesc) lines.push(`Description: ${draft.ideaDesc}`);
  lines.push(`Assessment: ${scoreSummary}`,"","Opportunity scores:");
  VALIDATE_DIMENSIONS.forEach(d=>lines.push(`  - ${d.label}: ${draft.scores?.[d.key]==null?"Not assessed":`${draft.scores[d.key]}/5`}`));
  const assumptions=ASSUMPTION_CATEGORIES.filter(c=>draft.assumptions?.[c.key]?.trim());
  if(assumptions.length){lines.push("","Key assumptions:");assumptions.forEach(c=>lines.push(`  - ${c.label}: ${draft.assumptions[c.key].trim()}`));}
  if(draft.attachedSignals?.length){lines.push("",`Attached evidence (${draft.attachedSignals.length}; review ${draft.evidenceReviewed?"completed":"pending"}):`);draft.attachedSignals.forEach(s=>lines.push(`  - ${s.title}${s.source?` (${s.source})`:""}${s.confidence_impact?` — ${s.confidence_impact}`:""}`));}
  if(draft.risks?.trim())lines.push("",`Risks / unknowns: ${draft.risks.trim()}`);
  if(draft.nextActions?.trim())lines.push("",`Next validation actions: ${draft.nextActions.trim()}`);
  const normalise=v=>String(v||"").replace(/\s+/g," ").trim();
  return normalise(text)===normalise(lines.join("\n"));
}

