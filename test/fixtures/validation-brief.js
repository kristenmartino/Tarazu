export const draftFixture = () => ({
  mode: "manual", candidateId: "", ideaName: "Approval reminders", ideaDesc: "Test a weekly digest",
  manualName: "Approval reminders", manualDesc: "Test a weekly digest",
  assumptions: { problem: "Approvals stall", audience: "Admins" },
  scores: { problemSeverity: 5, evidenceStrength: null, marketPull: 3, differentiation: null, monetizationClarity: null, buildFeasibility: 4, strategicFit: 5 },
  evidenceReviewed: false,
  attachedSignals: [{ id: "s1", title: "Interview", body: "One admin reports delays", source: "Interview 1", confidence_impact: "increases" }],
  productContext: { productSummary: "Approvals", targetUsers: "Admins", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" },
  risks: "Small sample", nextActions: "Interview three more admins",
});
