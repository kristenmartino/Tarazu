import { useEffect, useState } from "react";
import { loadLocalBriefs, saveLocalBrief, BriefDraftSchema } from "../../lib/validation-brief";
import { fetchValidationBriefs, saveValidationBrief } from "../../lib/cloud-storage";
import { ValidateScreen } from "./ValidateScreen";

// Mounted with a workspace/auth key: an in-flight save may finish for the old
// workspace, but cannot replace the new workspace's editor or saved list.
export function ValidationWorkspace({ workspaceId, isSignedIn, ...props }) {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError("");
    Promise.resolve().then(() => isSignedIn ? fetchValidationBriefs(workspaceId) : loadLocalBriefs(workspaceId))
      .then(records => { if (!cancelled) setBriefs(records); })
      .catch(() => { if (!cancelled) setError("Saved briefs could not be loaded. Retry before editing so an existing brief is not overwritten."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, isSignedIn, attempt]);

  const saveBrief = async (draft, previous) => {
    const clean = BriefDraftSchema.parse(draft);
    try {
      const record = isSignedIn
        ? await saveValidationBrief(workspaceId, clean, previous)
        : saveLocalBrief(workspaceId, clean, previous);
      setBriefs(prev => [record, ...prev.filter(b => b.id !== record.id)]);
      return record;
    } catch (err) {
      // A conflict must offer the actual latest record to reopen, rather than
      // the stale list loaded when this tab first opened. Keep editor edits.
      Promise.resolve().then(() => isSignedIn ? fetchValidationBriefs(workspaceId) : loadLocalBriefs(workspaceId))
        .then(setBriefs).catch(() => {});
      throw err;
    }
  };
  if (loading) return <p role="status" style={{ padding: 24 }}>Loading validation briefs…</p>;
  if (error) return <div style={{ padding: 24 }}><p role="alert">{error}</p><button onClick={() => setAttempt(n => n + 1)}>Retry loading briefs</button></div>;
  return <ValidateScreen {...props} briefs={briefs} onSaveBrief={saveBrief} storageLabel={isSignedIn ? "Saved to this workspace" : "Saved in this browser"} />;
}
