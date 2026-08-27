import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'self' blob: data: https://*.supabase.co",
  "object-src 'self' blob: data: https://*.supabase.co",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co blob: data:",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  /**
   * Prefer HTTP redirects over page-level `redirect()` for these aliases.
   * App Router client navigations through Server Component `redirect()` can
   * trip React #310 (Next `useActionQueue` conditionally calls `use()` when
   * router state is a thenable during the redirect flight).
   */
  async redirects() {
    return [
      {
        source: "/ceo/leave",
        destination: "/ceo/approvals/leave",
        permanent: false,
      },
      {
        source: "/ceo/exit",
        destination: "/ceo/approvals/exit",
        permanent: false,
      },
      {
        source: "/ceo/payroll",
        destination: "/ceo/payroll/run",
        permanent: false,
      },
      {
        source: "/ceo/regularization",
        destination: "/ceo/approvals/regularization",
        permanent: false,
      },
      {
        source: "/dashboard/recruitment",
        destination: "/dashboard/recruitment/jobs",
        permanent: false,
      },
      {
        source: "/ceo/recruitment",
        destination: "/ceo/recruitment/jobs",
        permanent: false,
      },
      {
        source: "/manager/recruitment",
        destination: "/manager/recruitment/jobs",
        permanent: false,
      },
      {
        source: "/dashboard/reports",
        destination: "/dashboard/reports/attendance",
        permanent: false,
      },
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-avatar",
      "@radix-ui/react-label",
      "@radix-ui/react-separator",
      "@tanstack/react-table",
    ],
    staleTimes: {
      dynamic: 300,
      static: 600,
    },
    // Profile images up to 10 MB; documents up to 30 MB via Server Actions.
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
