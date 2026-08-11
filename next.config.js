/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint these dirs during `next lint` and `next build`.
    dirs: ["app", "src", "lib"],
  },
  async redirects() {
    return [
      // The canonical path is the hub-and-spoke one, so /frameworks can grow
      // siblings later. This keeps the short URL working for anyone who links it.
      { source: "/rice", destination: "/frameworks/rice", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops a browser MIME-sniffing a text/plain response (llms.txt,
          // robots.txt) into something it will execute.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Matches the modern browser default; making it explicit means older
          // clients behave the same. Clerk and Supabase authenticate on Origin
          // and bearer tokens, not Referer, so nothing here depends on it.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // SAMEORIGIN rather than DENY — Vercel's preview toolbar frames the
          // deployment, and DENY would break preview comments.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default nextConfig;
