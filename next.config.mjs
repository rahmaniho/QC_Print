/** @type {import('next').NextConfig} */
// Origins allowed to talk to `next dev` when the app is opened through a tunnel/preview host.
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "*.e2b.app,*.arena.ai")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
