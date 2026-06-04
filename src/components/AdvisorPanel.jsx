import { useC } from "../ThemeProvider";
import { ProductContext } from "./ProductContext";
import { AIPanel } from "./AIPanel";
import { FeedbackDashboard } from "./FeedbackDashboard";
import { Pill } from "./Pill";

// The Product Context + Decision Advisor + Feedback Dashboard stack.
// Shown in the desktop right rail (no candidate selected) and as a dedicated
// full screen on mobile/tablet, where the right rail is overlay-only (#18).
export const AdvisorPanel = ({
  scored,
  productContext,
  onProductContextChange,
  onAnalysisEvent,
  onAnalysisFeedback,
  feedbackContext,
  feedbackSummary,
  onAddDecision,
  onScreenChange,
}) => {
  const C = useC();
  return (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    <ProductContext context={productContext} onChange={onProductContextChange} />
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Decision Advisor</h2>
        <Pill color={C.purple} dimColor={C.purpleDim} small>AI</Pill>
      </div>
      <p style={{ fontSize: 10, color: C.textDim, margin: "0 0 12px", lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>
        Recommendation generated from current candidate scores, strategy context, and available signals.
      </p>
      <AIPanel
        scored={scored}
        productContext={productContext}
        onAnalysisEvent={onAnalysisEvent}
        onAnalysisFeedback={onAnalysisFeedback}
        feedbackContext={feedbackContext}
        onSaveDecisionDraft={onAddDecision}
        onScreenChange={onScreenChange}
      />
    </div>
    <FeedbackDashboard summary={feedbackSummary} />
  </div>
  );
};
