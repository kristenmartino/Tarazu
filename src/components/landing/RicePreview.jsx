import { rice } from '../../utils';

// Fictional examples from the prepared demo. Use the app's calculation rather
// than maintaining a second formula or hand-entered index beside the inputs.
const CANDIDATES = [
  { name: 'Readiness checklist', reach: 75, impact: 75, confidence: 20, effort: 15 },
  { name: 'Approval reminders', reach: 55, impact: 55, confidence: 20, effort: 35 },
  { name: 'Status dashboard', reach: 15, impact: 35, confidence: 20, effort: 55 },
];
const INPUTS = ['Reach', 'Impact', 'Confidence', 'Effort'];

export function RicePreview() {
  const ranked = CANDIDATES.map(candidate => ({ ...candidate, score: rice(candidate) }))
    .sort((a, b) => b.score - a.score);

  return <section className="card rice-preview" data-reveal aria-label="Illustrative RICE scorecard">
    <div className="card-bar">
      <span className="ttl">RICE scorecard</span>
      <span className="example">Fictional example</span>
    </div>
    <table className="sc-table" role="table" aria-label="Illustrative RICE ranking">
      <caption>All four inputs are 1–100 band scores.</caption>
      <thead><tr>
        <th scope="col">Candidate</th>
        {INPUTS.map(input => <th scope="col" key={input}>{input}</th>)}
        <th scope="col">RICE index</th>
      </tr></thead>
      <tbody>{ranked.map((candidate, index) => <tr className={`sc-row${index === 0 ? ' top' : ''}`} key={candidate.name}>
        <th scope="row"><span className="name"><span className="rank">{index + 1}</span>{candidate.name}</span></th>
        {INPUTS.map(input => <td className="met" key={input}><span className="sc-label" aria-hidden="true">{input}</span>{candidate[input.toLowerCase()]}</td>)}
        <td className="score"><span className="sc-label" aria-hidden="true">RICE index</span>{candidate.score.toLocaleString('en-US')}</td>
      </tr>)}</tbody>
    </table>
    <div className="sc-foot">
      <span className="sc-formula">RICE index = (Reach × Impact × Confidence) ÷ Effort</span>
      <span>Illustrative priority index, not measured return.</span>
    </div>
  </section>;
}
