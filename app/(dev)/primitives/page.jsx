"use client";
// SCRATCH / DEV route (§3 "verify primitives in isolation"). Temporary — remove
// before the final Phase 2 merge (tracked in TARAZU_THEME_MIGRATION.md 2e).
import { useState } from "react";
import {
  Button, Input, Textarea, Select, Field, Checkbox, Radio, Switch,
  Badge, RankChip, ScoreChip, Card, Tabs, Menu, MenuItem, Modal, Tooltip,
  Alert, Skeleton, Spinner, EmptyState,
} from "../../../src/components/ui";

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 40 }}>
    <h2 style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--text-primary)", margin: "0 0 14px", letterSpacing: "-0.02em" }}>{title}</h2>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>{children}</div>
  </section>
);
const Swatch = ({ name, varName, text }) => (
  <div style={{ width: 132 }}>
    <div style={{ height: 44, borderRadius: 8, background: `var(${varName})`, border: "1px solid var(--border)" }} />
    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 5 }}>{name}</div>
    {text && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: `var(${varName})`, marginTop: 2 }}>Aa text</div>}
  </div>
);

export default function PrimitivesShowcase() {
  const [sw, setSw] = useState(true);
  const [tab, setTab] = useState("list");
  const [modal, setModal] = useState(false);
  const [chk, setChk] = useState(true);

  return (
    <div className="tzui-root" style={{ minHeight: "100vh", background: "var(--surface-base)", padding: "40px clamp(20px,5vw,64px)" }}>
      <header style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 30, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>Tarazu UI — primitives</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 6 }}>Phase 2a · token-based components in isolation · <span style={{ fontFamily: "var(--mono)", color: "var(--text-tertiary)" }}>scratch route, removed before merge</span></p>
      </header>

      <Section title="Surfaces / elevation">
        <Swatch name="--surface-base" varName="--surface-base" />
        <Swatch name="--surface-raised" varName="--surface-raised" />
        <Swatch name="--surface-overlay" varName="--surface-overlay" />
        <Swatch name="--surface-sunken" varName="--surface-sunken" />
      </Section>
      <Section title="Text">
        <Swatch name="--text-primary" varName="--text-primary" text />
        <Swatch name="--text-secondary" varName="--text-secondary" text />
        <Swatch name="--text-tertiary" varName="--text-tertiary" text />
        <Swatch name="--text-accent" varName="--text-accent" text />
      </Section>
      <Section title="Accent + status">
        <Swatch name="--accent" varName="--accent" />
        <Swatch name="--success" varName="--success" />
        <Swatch name="--warning" varName="--warning" />
        <Swatch name="--danger" varName="--danger" />
        <Swatch name="--info" varName="--info" />
      </Section>
      <Section title="Data-viz">
        <Swatch name="--viz-1" varName="--viz-1" /><Swatch name="--viz-2" varName="--viz-2" />
        <Swatch name="--viz-3" varName="--viz-3" /><Swatch name="--viz-4" varName="--viz-4" />
        <Swatch name="--viz-5" varName="--viz-5" /><Swatch name="--viz-6" varName="--viz-6" />
      </Section>

      <Section title="Buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">Small</Button>
      </Section>

      <Section title="Inputs">
        <div style={{ width: 220 }}><Field label="Label" htmlFor="i1"><Input id="i1" placeholder="Placeholder" /></Field></div>
        <div style={{ width: 220 }}><Field label="Invalid" error="Required" htmlFor="i2"><Input id="i2" invalid defaultValue="bad" /></Field></div>
        <div style={{ width: 220 }}><Field label="Disabled" htmlFor="i3"><Input id="i3" disabled placeholder="Disabled" /></Field></div>
        <div style={{ width: 220 }}><Field label="Select" htmlFor="s1"><Select id="s1"><option>RICE</option><option>Value/Effort</option></Select></Field></div>
        <div style={{ width: 280 }}><Field label="Textarea" htmlFor="t1"><Textarea id="t1" placeholder="Rationale…" /></Field></div>
      </Section>

      <Section title="Toggles">
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}><Checkbox checked={chk} onChange={(e) => setChk(e.target.checked)} /> Checkbox</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}><Radio name="r" defaultChecked /> Radio A</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-secondary)", fontSize: 13 }}><Radio name="r" /> Radio B</label>
        <Switch checked={sw} onChange={setSw} aria-label="Toggle" />
      </Section>

      <Section title="Badges / chips">
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="accent">Brand</Badge>
        <Badge variant="success">High conf.</Badge>
        <Badge variant="warning">Review</Badge>
        <Badge variant="danger">Risk</Badge>
        <Badge variant="info">Info</Badge>
        <RankChip rank={1} top /><RankChip rank={4} />
        <ScoreChip top>8.4</ScoreChip><ScoreChip>3.9</ScoreChip>
      </Section>

      <Section title="Tabs / Menu / Card">
        <Tabs items={[{ value: "list", label: "List" }, { value: "map", label: "Tradeoff Map" }, { value: "rank", label: "Rank" }]} value={tab} onChange={setTab} />
        <Menu><MenuItem>Edit</MenuItem><MenuItem>Duplicate</MenuItem><MenuItem danger>Delete</MenuItem></Menu>
        <Card style={{ width: 240 }}><div style={{ fontFamily: "var(--display)", fontWeight: 700, color: "var(--text-primary)" }}>Card</div><p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "6px 0 0" }}>Raised surface panel.</p></Card>
      </Section>

      <Section title="Alerts">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 360 }}>
          <Alert variant="success">Decision saved.</Alert>
          <Alert variant="warning">Confidence is low — needs review.</Alert>
          <Alert variant="danger">Sync failed.</Alert>
          <Alert variant="info">RICE recalculated.</Alert>
        </div>
      </Section>

      <Section title="Feedback / overlay">
        <Button onClick={() => setModal(true)}>Open modal</Button>
        <Tooltip>Weighted score</Tooltip>
        <Spinner />
        <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 8 }}><Skeleton width="60%" /><Skeleton /><Skeleton width="80%" /></div>
      </Section>

      <Section title="Empty state">
        <div style={{ width: 420 }}>
          <EmptyState title="Nothing to prioritize yet." description="Add your first candidate or import a backlog.">
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}><Button size="sm">Add candidate</Button><Button variant="secondary" size="sm">Import CSV</Button></div>
          </EmptyState>
        </div>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Archive decision?"
        footer={<><Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => setModal(false)}>Archive</Button></>}>
        <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0 }}>This moves the decision to the archive. You can restore it later.</p>
      </Modal>
    </div>
  );
}
