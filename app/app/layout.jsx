// A server component purely so the workspace can carry `noindex`: app/app/page.jsx
// is "use client" and a client component cannot export `metadata`.
//
// Why noindex rather than a robots.txt Disallow: Disallow blocks *crawling*, which
// stops a crawler from ever reading this tag — a disallowed-but-linked URL can still
// surface in results as a bare, description-less entry. Allowing the crawl and
// serving noindex is the only combination that actually keeps a page out of the index.
export const metadata = {
  title: "Tarazu Workspace",
  robots: { index: false, follow: true },
};

export default function AppLayout({ children }) {
  return children;
}
