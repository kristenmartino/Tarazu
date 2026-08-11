// The brass balance-scale wordmark, shared by the landing and the marketing
// pages. Pure presentational SVG with no hooks, so it stays a server component
// and can be imported from either side of the client boundary.
export function BrandMark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 5v22M9 27h14" stroke="#E2AC4D" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9h20" stroke="#ECEAE4" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 9l-3.5 7a4 4 0 0 0 7 0L6 9zM26 9l-3.5 7a4 4 0 0 0 7 0L26 9z" stroke="#E2AC4D" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(226,172,77,0.10)" />
      <circle cx="16" cy="9" r="1.6" fill="#E2AC4D" />
    </svg>
  );
}
