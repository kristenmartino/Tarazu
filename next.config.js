/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint these dirs during `next lint` and `next build`.
    dirs: ["app", "src", "lib"],
  },
};
export default nextConfig;
