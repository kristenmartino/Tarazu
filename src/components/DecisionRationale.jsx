import { ASSUMPTION_CATEGORIES, VALIDATE_DIMENSIONS } from "../validate/validationScore";
import "./decision-story.css";

const object = value => value && typeof value === "object" && !Array.isArray(value);
const textValue = value => typeof value === "string" ? value : "";

export function SourceBriefReference({decision}) {
  const brief=decision.recommendation_snapshot?.validation_brief;
  if(!object(brief)) return null;
  const revision=Number.isSafeInteger(brief.revision)&&brief.revision>0 ? brief.revision : "unavailable";
  return <p className="tz-decision-source">Source brief: {textValue(brief.draft?.ideaName) || "Unnamed preserved brief"} · Revision {revision}. This decision keeps the brief as it was when recorded.</p>;
}

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

// Plain text only: preserve paragraphs, headings and bullet lines without HTML.
export function ReadableText({ text }) {
  const blocks=String(text||"").split(/\n\s*\n/).filter(Boolean);
  return <>{blocks.map((block,index)=>{
    const lines=block.split("\n");const heading=lines[0].trim();
    const hasHeading=heading.endsWith(":") && !/^\s*[-*•]/.test(heading);
    const content=hasHeading?lines.slice(1):lines;
    const bullets=content.length>0 && content.every(line=>/^\s*[-*•]\s+/.test(line));
    return <div key={index}>{hasHeading&&<h4>{heading.slice(0,-1)}</h4>}{bullets?<ul>{content.map((line,i)=><li key={i}>{line.replace(/^\s*[-*•]\s+/,"")}</li>)}</ul>:content.length>0&&<p>{content.join("\n")}</p>}</div>;
  })}</>;
}

export function DecisionRationale({ decision:d }) {
  const snapshot=d.recommendation_snapshot;
  const brief=snapshot?.validation_brief;
  const raw=brief?.draft;
  const draft=object(raw)?{
    assumptions:Object.fromEntries(ASSUMPTION_CATEGORIES.map(c=>[c.key,textValue(raw.assumptions?.[c.key])])),
    attachedSignals:Array.isArray(raw.attachedSignals)?raw.attachedSignals.filter(object).map(s=>({id:textValue(s.id),title:textValue(s.title)||"Preserved source",body:textValue(s.body),source:textValue(s.source),confidence_impact:textValue(s.confidence_impact)})):[],
    evidenceAvailable:Array.isArray(raw.attachedSignals),evidenceReviewed:typeof raw.evidenceReviewed==="boolean"?raw.evidenceReviewed:null,risks:textValue(raw.risks),nextActions:textValue(raw.nextActions),
  }:null;
  const generated=isGeneratedBriefText(d.final_rationale,d);
  const evidence=draft?.attachedSignals || [];
  const status=textValue(snapshot?.recommendation);
  const count=Number.isInteger(snapshot?.assessedCount)&&snapshot.assessedCount>=0&&snapshot.assessedCount<=VALIDATE_DIMENSIONS.length?snapshot.assessedCount:null;
  const expectedOutcome=textValue(d.expected_outcome);
  const nextMatches=Boolean(draft?.nextActions && expectedOutcome.trim()===draft.nextActions.trim());
  return <div className="tz-decision-story">
    {draft&&<p className="tz-decision-source">Problem and evidence are preserved source-brief context. The recorded decision appears separately below.{Number.isInteger(count)&&<> Recorded assessment: {count}/{VALIDATE_DIMENSIONS.length} dimensions assessed{status?` · ${status}`:""}.</>}</p>}
    {draft?.assumptions?.problem&&<section aria-label="Problem"><h3>Problem</h3><ReadableText text={draft.assumptions.problem}/>{ASSUMPTION_CATEGORIES.some(c=>c.key!=="problem"&&draft.assumptions[c.key])&&<details><summary>Audience and original assumptions</summary>{ASSUMPTION_CATEGORIES.filter(c=>c.key!=="problem"&&draft.assumptions[c.key]).map(c=><div key={c.key}><h4>{c.label}</h4><ReadableText text={draft.assumptions[c.key]}/></div>)}</details>}</section>}
    {draft&&<section aria-label="Evidence"><h3>Evidence</h3><p className="tz-decision-source">{draft.evidenceReviewed===true?"Evidence marked reviewed in this saved brief; review is not independent verification.":draft.evidenceReviewed===false?"Evidence review was not completed in this saved brief.":"Evidence review status was not recorded."}</p>{evidence.length?<ul className="tz-decision-evidence">{evidence.map((s,index)=><li key={`${s.id}:${index}`}><strong>{s.title}</strong><span className="tz-decision-source">{s.confidence_impact==="increases"?"Supports the originating candidate":s.confidence_impact==="decreases"?"Challenges the originating candidate":"Context for the originating candidate"}{s.source?` · ${s.source}`:""}</span>{s.body&&<p>{s.body.length > 180 ? s.body.slice(0,180).trimEnd() + "…" : s.body}</p>}{s.body&&<details><summary>Read preserved source and caveats</summary><ReadableText text={s.body}/></details>}</li>)}</ul>:<p>{draft.evidenceAvailable?"No evidence was attached to this preserved brief.":"Preserved evidence details are unavailable in this record."}</p>}</section>}
    <section aria-label="Decision"><h3>Decision</h3>{d.chosen_candidate_name&&<p><strong>Chosen: {d.chosen_candidate_name}</strong></p>}{d.summary_rationale&&<ReadableText text={d.summary_rationale}/>}<p className="tz-decision-source">Status: {d.status || "not recorded"}.</p>{d.final_rationale&&(generated?<details><summary>Full recorded rationale</summary><ReadableText text={d.final_rationale}/></details>:<div><h4>Recorded rationale</h4><ReadableText text={d.final_rationale}/></div>)}{expectedOutcome&&!nextMatches&&<div><h4>Recorded expected outcome</h4><ReadableText text={expectedOutcome}/></div>}{d.tradeoffs_considered&&<details><summary>Tradeoffs considered</summary><ReadableText text={d.tradeoffs_considered}/></details>}{d.risks_accepted&&<details><summary>Risks accepted</summary><ReadableText text={d.risks_accepted}/></details>}</section>
    {draft?.nextActions&&<section aria-label="Next test"><h3>Next test</h3>{!nextMatches&&<p className="tz-decision-source">Original proposed next action from the preserved source brief:</p>}<ReadableText text={draft.nextActions}/>{draft.risks&&<details><summary>Open risks and unknowns</summary><ReadableText text={draft.risks}/></details>}</section>}
  </div>;
}
