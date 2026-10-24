import { ASSUMPTION_CATEGORIES, VALIDATE_DIMENSIONS } from "../validate/validationScore";
import "./decision-story.css";
import { evidenceGroups } from "../../lib/decision-record";
import { isGeneratedBriefText } from "../../lib/decision-text";
export { isGeneratedBriefText } from "../../lib/decision-text";

const object = value => value && typeof value === "object" && !Array.isArray(value);
const textValue = value => typeof value === "string" ? value : "";

export function SourceBriefReference({decision}) {
  const brief=decision.recommendation_snapshot?.validation_brief;
  if(!object(brief)) return null;
  const revision=Number.isSafeInteger(brief.revision)&&brief.revision>0 ? brief.revision : "unavailable";
  return <p className="tz-decision-source">Source brief: {textValue(brief.draft?.ideaName) || "Unnamed preserved brief"} · Revision {revision}. Saved with this decision.</p>;
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
    {draft&&<p className="tz-decision-source">Problem and evidence from the saved brief.{Number.isInteger(count)&&<> Assessment: {count}/{VALIDATE_DIMENSIONS.length} dimensions assessed{status?` · ${status}`:""}.</>}</p>}
    {draft?.assumptions?.problem&&<section aria-label="Problem"><h3>Problem</h3><ReadableText text={draft.assumptions.problem}/>{ASSUMPTION_CATEGORIES.some(c=>c.key!=="problem"&&draft.assumptions[c.key])&&<details><summary>Audience and original assumptions</summary>{ASSUMPTION_CATEGORIES.filter(c=>c.key!=="problem"&&draft.assumptions[c.key]).map(c=><div key={c.key}><h4>{c.label}</h4><ReadableText text={draft.assumptions[c.key]}/></div>)}</details>}</section>}
    {draft&&<section aria-label="Evidence"><h3>Evidence</h3><p className="tz-decision-source">{draft.evidenceReviewed===true?"Marked reviewed in this brief; not independently verified.":draft.evidenceReviewed===false?"Evidence review incomplete.":"Evidence review not recorded."}</p>
      {evidence.length > 0 && <p className="tz-decision-source">Groups refer to the originating candidate{typeof raw.ideaName === "string" && raw.ideaName ? `, ${raw.ideaName}` : ""}. The chosen option is recorded below.</p>}
      {evidence.length ? <div className="tz-evidence-digest">{evidenceGroups(d).map(group => <div key={group.key} className={`tz-evidence-group tz-evidence-${group.key}`}><h4>{group.label}<span>{group.items.length}</span></h4>{group.items.length ? <ul className="tz-decision-evidence">{group.items.map((s,index)=><li key={`${s.id}:${index}`}><strong>{s.title || "Preserved source"}</strong><span className="tz-decision-source">{s.confidence_impact==="increases"?"Supports the originating candidate":s.confidence_impact==="decreases"?"Challenges the originating candidate":"Context for the originating candidate"}{s.source?` · ${s.source}`:""}</span>{s.body&&<p>{s.body.length > 180 ? s.body.slice(0,180).trimEnd() + "…" : s.body}</p>}{s.body&&<details><summary>Read preserved source and caveats</summary><ReadableText text={s.body}/></details>}</li>)}</ul> : <p className="tz-decision-source">No preserved sources in this group.</p>}</div>)}</div> : <p>{draft.evidenceAvailable?"No evidence was attached to this preserved brief.":"Preserved evidence details are unavailable in this record."}</p>}
      <div className="tz-evidence-unknowns"><h4>Unknowns</h4><ReadableText text={draft.risks || "Unknowns not recorded in this brief."}/></div>
    </section>}
    <section aria-label="Decision"><h3>Decision</h3>{d.chosen_candidate_name&&<p><strong>Chosen: {d.chosen_candidate_name}</strong></p>}{d.summary_rationale&&<ReadableText text={d.summary_rationale}/>}<p className="tz-decision-source">Status: {d.status || "not recorded"}.</p>{d.final_rationale&&(generated?<details><summary>Full recorded rationale</summary><ReadableText text={d.final_rationale}/></details>:<div><h4>Recorded rationale</h4><ReadableText text={d.final_rationale}/></div>)}{expectedOutcome&&!nextMatches&&<div><h4>Recorded expected outcome</h4><ReadableText text={expectedOutcome}/></div>}{d.tradeoffs_considered&&<details><summary>Tradeoffs considered</summary><ReadableText text={d.tradeoffs_considered}/></details>}{d.risks_accepted&&<details><summary>Risks accepted</summary><ReadableText text={d.risks_accepted}/></details>}</section>
    {draft?.nextActions&&<section aria-label="Next test"><h3>Next test</h3>{!nextMatches&&<p className="tz-decision-source">Proposed in the saved brief:</p>}<ReadableText text={draft.nextActions}/></section>}
  </div>;
}
