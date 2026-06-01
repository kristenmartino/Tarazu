"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./landing.css";

// Decorative brass "balance-scale" wordmark used in the header + footer.
function BrandMark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 5v22M9 27h14" stroke="#E2AC4D" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9h20" stroke="#ECEAE4" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9l-3.5 7a4 4 0 0 0 7 0L6 9zM26 9l-3.5 7a4 4 0 0 0 7 0L26 9z" stroke="#E2AC4D" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(226,172,77,0.10)" />
      <circle cx="16" cy="9" r="1.6" fill="#E2AC4D" />
    </svg>
  );
}

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
    return () => io.disconnect();
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
          </nav>
          <div className="nav-cta">
            <Link href="/sign-up" className="btn btn-solid">
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
              <span className="eyebrow">Product decision intelligence</span>
              <h1>Weigh what to <span className="br">build next.</span></h1>
              <p className="lede">
                Tarazu turns scattered requests, feedback, and data into ranked, defensible
                decisions — then learns from what you ship, so every call gets sharper.
              </p>
              <div className="hero-actions">
                <Link href="/sign-up" className="btn btn-solid">
                  Start prioritizing <span className="arrow">→</span>
                </Link>
                <a href="#lifecycle" className="btn btn-ghost">See the lifecycle</a>
              </div>
              <div className="hero-foot"><span className="pip" /> From signal to shipped — in one loop</div>
            </div>

            {/* balance scale */}
            <div className="scale-stage" role="img" aria-label="A balance scale weighing two options, settling into balance">
              <div className="scale-glow" aria-hidden="true" />
              <svg className="scale" viewBox="0 0 440 360" fill="none" aria-hidden="true">
                {/* base + post */}
                <path d="M220 70 V300" stroke="#ECEAE4" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                <path d="M180 300 h80" stroke="#ECEAE4" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
                <ellipse cx="220" cy="312" rx="58" ry="9" fill="rgba(226,172,77,0.12)" />
                {/* rotating beam group */}
                <g className="scale-beam">
                  <path d="M70 92 H370" stroke="#E2AC4D" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="220" cy="92" r="6" fill="#E2AC4D" />
                  {/* left pan (heavier) */}
                  <path d="M70 92 L48 168 M70 92 L92 168" stroke="#9b8a63" strokeWidth="1.5" />
                  <path d="M30 168 a40 22 0 0 0 80 0 Z" fill="rgba(226,172,77,0.14)" stroke="#E2AC4D" strokeWidth="1.8" />
                  <circle cx="70" cy="158" r="13" fill="rgba(226,172,77,0.30)" stroke="#E2AC4D" strokeWidth="1.5" />
                  <text className="opt" x="70" y="200" textAnchor="middle">Option A</text>
                  {/* right pan (lighter) */}
                  <path d="M370 92 L352 150 M370 92 L388 150" stroke="#9b8a63" strokeWidth="1.5" />
                  <path d="M335 150 a35 19 0 0 0 70 0 Z" fill="rgba(236,234,228,0.05)" stroke="#9b8a63" strokeWidth="1.6" />
                  <circle cx="370" cy="142" r="8" fill="rgba(236,234,228,0.10)" stroke="#9b8a63" strokeWidth="1.4" />
                  <text className="opt" x="370" y="182" textAnchor="middle">Option B</text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* ============ DEFINITION ============ */}
        <div className="define">
          <div className="wrap">
            <span><b>ta·ra·zu</b></span>
            <span className="sep">/</span>
            <span>noun</span>
            <span className="sep">/</span>
            <span>the balance scales — an instrument for weighing what matters.</span>
          </div>
        </div>

        {/* ============ LIFECYCLE ============ */}
        <section className="band lifecycle" id="lifecycle">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <span className="eyebrow">The decision lifecycle</span>
              <h2>Five steps. <span className="br">One loop.</span></h2>
              <p>Tarazu runs the whole arc of a product decision — and the last step feeds the first, so the system keeps getting smarter.</p>
            </div>
            <div className="loop" data-reveal>
              <div className="stage">
                <div className="node">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 0 0 1 9-9M7 12a5 5 0 0 1 5-5" />
                    <circle cx="12" cy="12" r="1.6" />
                  </svg>
                </div>
                <div className="step-n">01</div><h3>Listen</h3>
                <p>Pull requests, feedback, data, and ideas into one place.</p>
              </div>
              <div className="stage">
                <div className="node">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 21V10M12 21V4M19 21v-7" />
                  </svg>
                </div>
                <div className="step-n">02</div><h3>Score</h3>
                <p>Weigh each option against the criteria your team cares about.</p>
              </div>
              <div className="stage">
                <div className="node">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5L19 7" />
                  </svg>
                </div>
                <div className="step-n">03</div><h3>Decide</h3>
                <p>Rank with a clear, shared rationale anyone can trace.</p>
              </div>
              <div className="stage">
                <div className="node">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z" />
                    <path d="M9.5 12l2 2 3.5-4" />
                  </svg>
                </div>
                <div className="step-n">04</div><h3>Ship</h3>
                <p>Turn the call into action and track it through to done.</p>
              </div>
              <div className="stage">
                <div className="node">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
                  </svg>
                </div>
                <div className="step-n">05</div><h3>Learn</h3>
                <p>Measure the outcome and feed it back to the next decision.</p>
              </div>
            </div>
            <div className="loop-back" data-reveal>
              <svg viewBox="0 0 40 14" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M38 7H6M12 2 6 7l6 5" />
              </svg>
              Learn feeds back into Listen
            </div>
          </div>
        </section>

        {/* ============ SHOWCASE (features + mock) ============ */}
        <section className="band showcase" id="features">
          <div className="wrap">
            <div className="sec-head" data-reveal>
              <span className="eyebrow">What you get</span>
              <h2>Decisions you can <span className="br">actually defend.</span></h2>
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
                    <h3>Every signal, one place</h3>
                  </div>
                  <p>Requests, feedback, data, and ideas together — so nothing important gets decided in the dark.</p>
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
                  <p>Weigh each option against the criteria and weights that matter to you — the same way, every time.</p>
                </div>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                    <h3>A rationale everyone sees</h3>
                  </div>
                  <p>A transparent ranking with the "why," so "this, not that" is never a mystery to your team or your stakeholders.</p>
                </div>
                <div className="feat">
                  <div className="ftop">
                    <span className="ficon">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
                      </svg>
                    </span>
                    <h3>Close the loop</h3>
                  </div>
                  <p>Track what you ship, measure the outcome, and feed it back — so the next decision is sharper than the last.</p>
                </div>
              </div>

              {/* scorecard mock */}
              <div className="card" data-reveal role="img" aria-label="Preview of the Tarazu priority scorecard, ranking initiatives by a weighted score">
                <div className="card-bar">
                  <span className="ttl">Priority scorecard</span>
                  <span className="live">Q3 board</span>
                </div>
                <div className="sc-head">
                  <span>Initiative</span>
                  <span>Impact</span>
                  <span className="h-eff">Effort</span>
                  <span className="h-conf">Confid.</span>
                  <span style={{ textAlign: "right" }}>Score</span>
                </div>
                <div className="sc-row top">
                  <span className="name"><span className="rank">1</span> Self-serve onboarding</span>
                  <span className="met">9</span><span className="met c-eff">3</span><span className="met c-conf">8</span><span className="score">8.4</span>
                </div>
                <div className="sc-row">
                  <span className="name"><span className="rank">2</span> Usage-based billing</span>
                  <span className="met">8</span><span className="met c-eff">6</span><span className="met c-conf">7</span><span className="score">6.1</span>
                </div>
                <div className="sc-row">
                  <span className="name"><span className="rank">3</span> SSO &amp; SCIM</span>
                  <span className="met">6</span><span className="met c-eff">5</span><span className="met c-conf">9</span><span className="score">5.7</span>
                </div>
                <div className="sc-row">
                  <span className="name"><span className="rank">4</span> Mobile companion app</span>
                  <span className="met">7</span><span className="met c-eff">9</span><span className="met c-conf">5</span><span className="score">3.9</span>
                </div>
                <div className="sc-foot"><span className="w">weights:</span> Impact ×3 · Effort ×2 · Confidence ×1 — edit anytime</div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ WHY ============ */}
        <section className="band" id="why">
          <div className="wrap">
            <div className="sec-head" data-reveal style={{ marginBottom: 0 }}>
              <span className="eyebrow">Why Tarazu</span>
              <h2>Roadmaps shouldn't run on <span className="br">whoever argues loudest.</span></h2>
              <p>The strongest opinion in the room isn't a strategy. Tarazu replaces gut-feel debates with a shared, repeatable way to weigh options — and a record of why you chose what you chose, ready the next time someone asks.</p>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="cta">
          <div className="wrap cta-inner">
            <h2>Bring balance to your <span className="br">roadmap.</span></h2>
            <p>Start weighing what to build next — and stop relitigating the same decisions every quarter.</p>
            <div className="hero-actions">
              <Link href="/sign-up" className="btn btn-solid">
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
              <p>The balance scale for product decisions. Weigh what matters, ship what counts, and learn from every call.</p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h5>Product</h5>
                <a href="#lifecycle">Lifecycle</a>
                <a href="#features">Features</a>
                <Link href="/sign-up">Start prioritizing</Link>
              </div>
              <div className="foot-col">
                <h5>More</h5>
                <a href="#why">Why Tarazu</a>
                <Link href="/sign-in">Open the app</Link>
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
