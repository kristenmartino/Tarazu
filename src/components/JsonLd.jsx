import { serialize } from "../../lib/schema";

/**
 * Renders a JSON-LD graph as a <script type="application/ld+json">.
 *
 * Deliberately a server component (no "use client"): the markup has to be in the
 * SSR byte stream for a crawler that does not execute JavaScript, and script
 * elements inside a client tree are hydration-fragile. Mount it as a *sibling*
 * of any "use client" component, never inside one.
 *
 * React never executes this — application/ld+json is a data block, not a script
 * type browsers run, which is also why CSP script-src does not govern it.
 */
export function JsonLd({ data, id }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
