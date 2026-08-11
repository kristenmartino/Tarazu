import Link from "next/link";

/** Page masthead: eyebrow, H1, and a lede paragraph. One per page. */
export function PageHero({ eyebrow, title, lede }) {
  return (
    <section className="page-hero">
      <div className="wrap">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
    </section>
  );
}

/**
 * A banded content section. `id` gives it an anchor so llms.txt and internal
 * links can point at a specific answer rather than the whole page.
 */
export function Section({ id, alt = false, children }) {
  return (
    <section className={`band${alt ? " band-alt" : ""}`} id={id}>
      <div className="wrap">{children}</div>
    </section>
  );
}

/** Measured long-form column. Everything readable goes inside one of these. */
export function Prose({ children }) {
  return <div className="prose">{children}</div>;
}

/**
 * A self-contained factual statement, styled to stand out.
 *
 * This is the unit that gets quoted. LLMs extract passages that answer a
 * question directly, so anything that is a checkable fact — a formula, a
 * threshold, a default — belongs in one of these rather than buried in a
 * paragraph of positioning copy.
 */
export function KeyFact({ label, children }) {
  return (
    <div className="key-fact">
      {label && <span className="key-fact-label">{label}</span>}
      <div className="key-fact-body">{children}</div>
    </div>
  );
}

/**
 * Comparison table. Renders a real <table> with a scroll container, because a
 * table is the single most reliably extracted structure in an AI answer and a
 * div grid is not.
 */
export function ComparisonTable({ caption, columns, rows }) {
  return (
    <div className="table-scroll">
      <table>
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <th scope="row">{row[0]}</th>
              {row.slice(1).map((cell, i) => (
                <td key={`${row[0]}-${columns[i + 1]}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Closing call to action. */
export function CtaBand({ title, body, primaryLabel = "Start prioritizing", primaryHref = "/sign-up" }) {
  return (
    <section className="band cta">
      <div className="wrap cta-inner">
        <h2>{title}</h2>
        {body && <p>{body}</p>}
        <div className="hero-actions">
          <Link href={primaryHref} className="btn btn-solid">
            {primaryLabel} <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
