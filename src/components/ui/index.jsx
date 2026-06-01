// Tarazu token-based UI primitives (Phase 2a). Stateless/controlled — consume the
// semantic tokens via tzui-* classes (src/components/ui/ui.css). Screens adopt these
// in 2b. Verify in isolation at /primitives (scratch route).
import "./ui.css";

const cx = (...c) => c.filter(Boolean).join(" ");

export function Button({ variant = "primary", size, className, ...props }) {
  return <button className={cx("tzui-btn", `tzui-btn--${variant}`, size === "sm" && "tzui-btn--sm", className)} {...props} />;
}

export function Input({ className, invalid, ...props }) {
  return <input className={cx("tzui-input", className)} aria-invalid={invalid || undefined} {...props} />;
}
export function Textarea({ className, invalid, ...props }) {
  return <textarea className={cx("tzui-textarea", className)} aria-invalid={invalid || undefined} {...props} />;
}
export function Select({ className, invalid, children, ...props }) {
  return <select className={cx("tzui-select", className)} aria-invalid={invalid || undefined} {...props}>{children}</select>;
}
export function Field({ label, error, htmlFor, children }) {
  return (
    <div>
      {label && <label className="tzui-field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error && <div className="tzui-field-error">{error}</div>}
    </div>
  );
}

export function Checkbox(props) { return <input type="checkbox" className="tzui-checkbox" {...props} />; }
export function Radio(props) { return <input type="radio" className="tzui-radio" {...props} />; }
export function Switch({ checked, onChange, disabled, "aria-label": ariaLabel }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel}
      className="tzui-switch" disabled={disabled}
      onClick={() => onChange && onChange(!checked)} />
  );
}

export function Badge({ variant = "neutral", className, children }) {
  return <span className={cx("tzui-badge", `tzui-badge--${variant}`, className)}>{children}</span>;
}
export function RankChip({ rank, top }) { return <span className={cx("tzui-chip-rank", top && "tzui-chip-rank--top")}>{rank}</span>; }
export function ScoreChip({ top, children }) { return <span className={cx("tzui-chip-score", top && "tzui-chip-score--top")}>{children}</span>; }

export function Card({ overlay, className, ...props }) {
  return <div className={cx("tzui-card", overlay && "tzui-card--overlay", className)} {...props} />;
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="tzui-tabs" role="tablist">
      {items.map((it) => {
        const v = it.value ?? it;
        const label = it.label ?? it;
        return (
          <button key={v} role="tab" aria-selected={v === value}
            className={cx("tzui-tab", v === value && "tzui-tab--active")}
            onClick={() => onChange && onChange(v)}>{label}</button>
        );
      })}
    </div>
  );
}

export function Menu({ children }) { return <div className="tzui-menu" role="menu">{children}</div>; }
export function MenuItem({ danger, className, ...props }) {
  return <button role="menuitem" className={cx("tzui-menu-item", danger && "tzui-menu-item--danger", className)} {...props} />;
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="tzui-scrim" onClick={onClose} role="presentation">
      <div className="tzui-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        {children}
        {footer && <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Tooltip({ children }) { return <span className="tzui-tooltip" role="tooltip">{children}</span>; }

export function Alert({ variant = "info", className, children }) {
  return (
    <div className={cx("tzui-alert", `tzui-alert--${variant}`, className)} role="status">
      <span className="tzui-alert__dot" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ width = "100%", height = 14, radius, style }) {
  return <div className="tzui-skeleton" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}
export function Spinner({ "aria-label": ariaLabel = "Loading" }) {
  return <div className="tzui-spinner" role="status" aria-label={ariaLabel} />;
}

export function EmptyState({ title, description, children }) {
  return (
    <div className="tzui-empty">
      <h4>{title}</h4>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
