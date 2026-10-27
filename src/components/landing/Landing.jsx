"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BrandMark } from "../marketing/BrandMark";
import { RicePreview } from "./RicePreview";
import { RelayDecisionPreview } from "./RelayDecisionPreview";
import "./landing.css";

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [year, setYear] = useState(null);
  const rootRef = useRef(null);

  // Current year (client-only to avoid a hydration mismatch across a year boundary).
  useEffect(() => setYear(new Date().getFullYear()), []);

  // Scroll reveals — mirrors the reference's IntersectionObserver. If IO is
  // unavailable or the user prefers reduced motion, reveal everything at once.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    // Failsafe: IO only fires for what enters the viewport, and a crawler that
    // renders with a tall viewport but never scrolls would leave every
    // below-the-fold section at opacity:0 (landing.css gates [data-reveal] on
    // html.js). Text is still in the DOM, but visual/screenshot crawlers would
    // capture blank bands. Reveal everything unconditionally after 2.5s — the
    // only cost is losing the animation for a visitor who never scrolls, who by
    // definition never saw those sections anyway.
    const failsafe = setTimeout(() => els.forEach((el) => el.classList.add("in")), 2500);
    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="tz-landing" ref={rootRef}>
      {/* ============ HEADER ============ */}
      <header>
        <div className="wrap nav">
          <a href="#top" className="brand" aria-label="Tarazu home">
            <BrandMark />
            Tarazu
          </a>
          <nav className={`nav-links${menuOpen ? " open" : ""}`} id="navlinks" aria-label="Primary">
            <a href="#lifecycle" onClick={closeMenu}>Lifecycle</a>
            <a href="#features" onClick={closeMenu}>Features</a>
            <a href="#why" onClick={closeMenu}>Why Tarazu</a>
            <Link href="/pricing" onClick={closeMenu}>Pricing</Link>
            <Link href="/frameworks/rice" onClick={closeMenu}>RICE Guide</Link>
            <Link href="/vs/spreadsheets" onClick={closeMenu}>vs. spreadsheets</Link>
            <Link href="/blog" onClick={closeMenu}>Blog</Link>
            <Link href="/sign-in" onClick={closeMenu}>Sign in</Link>
          </nav>
          <div className="nav-cta">
            <Link href="/app" className="btn btn-solid">
              Start prioritizing <span className="arrow">→</span>
            </Link>
            <button
              className="menu-btn"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="navlinks"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ============ HERO ============ */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Product decisions, explained</span>
              <h1>Make a decision <span className="br">you can explain.</span></h1>
              <p className="lede">
                Compare product options, keep the evidence and tradeoffs behind your choice,
                and revisit it when you learn something new.
              </p>
              <div className="hero-actions">
                <Link href="/app" className="btn btn-solid">
                  Start prioritizing <span className="arrow">→</span>
                </Link>
                <Link href="/demo" className="btn btn-ghost">Try the Relay demo</Link>
              </div>
              <div className="hero-foot"><span className="pip" /> Keep the notes behind your choice</div>
            </div>

            <RelayDecisionPreview compact />
          </div>
        </section>

        {/* ============ DEFINITION ============ */}
        <div className="define">
          <div className="wrap">
            <span><b>ta·ra·zu</b></span>
            <span className="sep">/</span>
            <span>noun</span>
            <span className="sep">/</span>
            <span>the balance scales.</span>
          </div>
        </div>

        {/* ============ LIFECYCLE ============ */}
        <section className="band lifecycle" id="lifecycle">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <span className="eyebrow">How it works</span>
              <h2>From a request <span className="br">to a decision.</span></h2>
              <p>Add what you know, compare the options, and save why you chose one. Return to the record when something changes.</p>
            </div>
            <div className="lifecycle-product-grid" data-reveal>
              <ol className="lifecycle-steps" aria-label="The five stages of a decision">
                <li><span className="step-n" aria-hidden="true">01</span><div><h3>Listen</h3><p>Pull requests, feedback, data, and ideas into one place.</p></div></li>
                <li><span className="step-n" aria-hidden="true">02</span><div><h3>Score</h3><p>Weigh each option against the criteria your team cares about.</p></div></li>
                <li><span className="step-n" aria-hidden="true">03</span><div><h3>Decide</h3><p>Rank with a clear, shared rationale anyone can trace.</p></div></li>
                <li className="record-step"><span className="step-n" aria-hidden="true">04</span><div><h3>Record</h3><p>Record your choice, expected outcome, and review date.</p></div></li>
                <li><span className="step-n" aria-hidden="true">05</span><div><h3>Review</h3><p>Record what happened, add new evidence, and choose whether to keep, revise or retire the direction.</p></div></li>
              </ol>
              <figure className="lifecycle-product">
                <div className="lifecycle-product-label"><span aria-hidden="true" /><span><strong>Record</strong> · fictional Relay example</span></div>
                <a href="/demo/relay-saved-decision.png" target="_blank" rel="noopener noreferrer" aria-label="View the captured fictional Relay decision summary at full size in a new tab">
                  <img src="/demo/relay-saved-decision.png" alt="Fictional Relay Round B decision at a glance, with the chosen checklist, reasoning, next test and review status." width="938" height="401" loading="lazy" />
                </a>
                <figcaption><p>A saved draft keeps the choice, evidence and next test together.</p><div><p>Fictional example. No real participants or measured results.</p><a href="/demo/relay-saved-decision.png" target="_blank" rel="noopener noreferrer" aria-label="View full-size example: captured fictional Relay decision, opens in a new tab">View full-size example ↗</a></div></figcaption>
              </figure>
            </div>
            <div className="loop-back" data-reveal>
              <svg viewBox="0 0 40 14" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M38 7H6M12 2 6 7l6 5" />
              </svg>
              New findings become part of the next review
            </div>
          </div>
        </section>

        {/* ============ WORKED DECISION ============ */}
        <section className="band worked-decision" aria-labelledby="worked-decision-heading">
          <div className="wrap worked-decision-grid">
            <div className="sec-head" data-reveal>
              <span className="eyebrow">A worked example</span>
              <h2 id="worked-decision-heading">A smaller test, <span className="br">with the reasoning attached.</span></h2>
              <p>A fictional team starts with a reminder idea, looks at conflicting evidence, and chooses what to test before committing to a build.</p>
              <p>The saved draft keeps the original context available for the next discussion.</p>
            </div>
            <div data-reveal><RelayDecisionPreview /></div>
          </div>
        </section>

        {/* ============ SHOWCASE (features + mock) ============ */}
        <section className="band showcase" id="features">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <span className="eyebrow">What you get</span>
              <h2>See what each <span className="br">choice rests on.</span></h2>
            </div>
            <div className="show-grid">
              <div className="feat-list" data-reveal>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 6h16M4 12h16M4 18h10" />
                      </svg>
                    </span>
                    <h3>Notes beside the options</h3>
                  </div>
                  <p>Attach an interview note, request or data point to the option it supports or challenges.</p>
                </div>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v18M5 8l7-5 7 5M5 8v8l7 4 7-4V8" />
                      </svg>
                    </span>
                    <h3>Scoring that's consistent</h3>
                  </div>
                  <p>Use shared Reach, Impact, Confidence and Effort definitions to compare options consistently.</p>
                </div>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                    <h3>A brief you can share</h3>
                  </div>
                  <p>Copy a decision brief with the problem, choice, tradeoffs, evidence and next test into your existing documents or messages.</p>
                </div>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
                      </svg>
                    </span>
                    <h3>Return with new evidence</h3>
                  </div>
                  <p>Record what happened, add a source, and choose whether to keep, revise or retire the direction. Earlier reasoning stays available.</p>
                </div>
              </div>

              <RicePreview />
            </div>
          </div>
        </section>

        {/* ============ WHY ============ */}
        <section className="band" id="why">
          <div className="wrap">
            <div className="sec-head" data-reveal style={{ marginBottom: 0 }}>
              <span className="eyebrow">Why Tarazu</span>
              <h2>Why did we <span className="br">choose this?</span></h2>
              <p>Keep the notes behind your choice, so the next discussion starts with the same context. You can see which sources supported it, what was uncertain, and what changed later.</p>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="cta">
          <div className="wrap cta-inner">
            <h2>Try it with a decision <span className="br">you need to make.</span></h2>
            <p>Compare two options, attach what you know, and save the next step.</p>
            <div className="hero-actions">
              <Link href="/app" className="btn btn-solid">
                Start prioritizing <span className="arrow">→</span>
              </Link>
              <a href="#lifecycle" className="btn btn-ghost">How it works</a>
            </div>
          </div>
        </section>
      </main>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand">
              <a href="#top" className="brand">
                <BrandMark />
                Tarazu
              </a>
              <p>Compare product options and keep the notes behind your choice.</p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h4>Product</h4>
                <a href="#lifecycle">Lifecycle</a>
                <a href="#features">Features</a>
                <Link href="/how-it-works">How it works</Link>
                <Link href="/app">Start prioritizing</Link>
              </div>
              <div className="foot-col">
                <h4>More</h4>
                <a href="#why">Why Tarazu</a>
                <Link href="/faq">FAQ</Link>
              <Link href="/contact">Feedback &amp; contact</Link>
              <Link href="/privacy">Privacy &amp; data</Link>
                <Link href="/about">About</Link>
                <Link href="/sign-in">Sign in</Link>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {year} Tarazu</span>
            <span>Designed &amp; built by <a href="https://kristenmartino.ai">Kristen Martino</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
