"use client";
import { useEffect, useState } from "react";
import { MEASUREMENT_KEY, measurementAllowed, trackUsage } from "../../lib/usage-events";

export function UsageMeasurement() {
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setAllowed(measurementAllowed()), []);
  const change = value => {
    try { localStorage.setItem(MEASUREMENT_KEY, value ? "yes" : "no"); setAllowed(measurementAllowed()); setMessage(value ? "Preference saved. Browser privacy signals take priority." : "Optional usage measurement is off."); }
    catch { setMessage("This browser could not save the preference. Measurement stays off."); }
  };
  return <div><p>Optional usage measurement is <strong>{allowed ? "on" : "off"}</strong> in this browser.</p><button style={{padding:"10px 14px",border:"1px solid currentColor",borderRadius:8,background:"transparent",color:"inherit",font:"inherit",cursor:"pointer"}} onClick={() => change(!allowed)}>{allowed ? "Turn usage measurement off" : "Allow anonymous usage counts"}</button><p role="status">{message}</p></div>;
}

export function UsageLinks() {
  useEffect(() => {
    const click = e => {
      const link = e.target?.closest?.("a[href]");
      if (link?.getAttribute("href")?.startsWith("mailto:")) trackUsage("feedback_opened", "public");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}
