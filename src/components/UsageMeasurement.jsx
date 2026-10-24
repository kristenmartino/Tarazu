"use client";
import { useEffect, useState } from "react";
import { MEASUREMENT_KEY, measurementAllowed, trackUsage } from "../../lib/usage-events";

export function UsageMeasurement() {
  const [allowed, setAllowed] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { try { setChosen(localStorage.getItem(MEASUREMENT_KEY) === "yes"); } catch {} setAllowed(measurementAllowed()); }, []);
  const change = value => {
    try { localStorage.setItem(MEASUREMENT_KEY, value ? "yes" : "no"); setChosen(value); const effective = measurementAllowed(); setAllowed(effective); setMessage(value ? effective ? "Optional usage measurement is on." : "Permission saved, but your browser privacy signal keeps measurement off. You can revoke permission below." : "Optional usage measurement is off."); }
    catch { setMessage("This browser could not save the preference. Measurement stays off."); }
  };
  return <div><p>Optional usage measurement is <strong>{allowed ? "on" : "off"}</strong> in this browser.</p><button style={{padding:"10px 14px",border:"1px solid currentColor",borderRadius:8,background:"transparent",color:"inherit",font:"inherit",cursor:"pointer"}} onClick={() => change(!chosen)}>{chosen ? allowed ? "Turn usage measurement off" : "Revoke saved usage permission" : "Allow anonymous usage counts"}</button><p role="status">{message}</p></div>;
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
