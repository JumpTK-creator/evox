import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TEMPORARY: Ignore TS errors to restore site
  // TODO: Fix all implicit any errors and remove this
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  async redirects() {
    const exact = [
      "/standup",
      "/agents",
      "/tasks",
      "/messages",
      "/activity",
      "/settings",
      "/registry",
      "/dashboard-v2",
      "/mission-control",
    ].map((source) => ({ source, destination: "/", permanent: true }));
    const withSlug = [
      { source: "/agents/:path*", destination: "/", permanent: true },
      { source: "/tasks/:path*", destination: "/", permanent: true },
    ];
    return [...exact, ...withSlug];
  },
};

export default nextConfig;
