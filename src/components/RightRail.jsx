import { useEffect, useRef } from "react";
import { useC } from "../ThemeProvider";
import { CandidateDetail } from "./CandidateDetail";
import { AdvisorPanel } from "./AdvisorPanel";

export const RightRail = ({
  selectedFeature, onDeselect,
  scored, maxScore,
  onEditFeature, onDeleteFeature, onRevert,
  productContext, onProductContextChange,
  onAnalysisEvent, onAnalysisFeedback,
  feedbackContext, feedbackSummary,
  isSignedIn, activeWsId,
  isMobile, isTablet,
  signals, onScreenChange,
  onAddDecision,
}) => {
  const C = useC();
  const isOverlay = isMobile || isTablet;
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  // Focus trap for overlay mode
  useEffect(() => {
    if (!isOverlay || !selectedFeature) return;
    previousFocus.current = document.activeElement;
    panelRef.current?.focus();
    return () => { previousFocus.current?.focus(); };
  }, [isOverlay, selectedFeature]);

  useEffect(() => {
    if (!isOverlay || !selectedFeature) return;
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll("button, input, textarea, select, a, [tabindex]:not([tabindex='-1'])");
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOverlay, selectedFeature]);

  const content = selectedFeature ? (
    <CandidateDetail
      feature={selectedFeature}
      maxScore={maxScore}
      onEdit={onEditFeature}
      onDelete={onDeleteFeature}
      onDeselect={onDeselect}
      isSignedIn={isSignedIn}
      activeWsId={activeWsId}
      onRevert={onRevert}
      signals={signals}
      onScreenChange={onScreenChange}
    />
  ) : (
    <AdvisorPanel
      scored={scored}
      productContext={productContext}
      onProductContextChange={onProductContextChange}
      onAnalysisEvent={onAnalysisEvent}
      onAnalysisFeedback={onAnalysisFeedback}
      feedbackContext={feedbackContext}
      feedbackSummary={feedbackSummary}
      onAddDecision={onAddDecision}
      onScreenChange={onScreenChange}
    />
  );

  if (isOverlay && !selectedFeature) return null;

  if (isOverlay) {
    return (
      <>
        {/* Backdrop */}
        <div onClick={onDeselect} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 199,
        }} />
        {/* Panel */}
        <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Candidate detail" tabIndex={-1} style={{
          position: "fixed", top: isMobile ? "10%" : 0, right: 0, bottom: 0,
          width: isMobile ? "100%" : 360, background: C.surface,
          borderLeft: `1px solid ${C.border}`,
          borderTopLeftRadius: isMobile ? 16 : 0,
          borderTopRightRadius: isMobile ? 16 : 0,
          zIndex: 200,
          overflowY: "auto", padding: "8px 20px 20px",
          boxShadow: `-8px 0 32px color-mix(in srgb, var(--surface-base) 50%, transparent)`,
          animation: isMobile ? "slideUp 0.3s ease" : "slideInRight 0.25s ease",
          outline: "none",
        }}>
          {/* Drag handle */}
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 12px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
          )}
          {content}
        </div>
      </>
    );
  }

  return (
    <div role="complementary" aria-label="Detail panel" style={{
      borderLeft: `1px solid ${C.border}`,
      overflowY: "auto", height: "calc(100vh - 48px)", position: "sticky", top: 48,
      padding: 20, boxSizing: "border-box",
      display: "flex", flexDirection: "column",
      flexShrink: 0, animation: "fadeIn 0.2s ease",
    }}>
      {content}
    </div>
  );
};
