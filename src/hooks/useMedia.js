import { useState, useEffect } from "react";

export const useMedia = (q) => {
  // Match the server during hydration; apply the actual viewport in the effect.
  const [m, setM] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia(q);
    const h = (e) => setM(e.matches);
    mql.addEventListener("change", h);
    setM(mql.matches);
    return () => mql.removeEventListener("change", h);
  }, [q]);
  return m;
};
