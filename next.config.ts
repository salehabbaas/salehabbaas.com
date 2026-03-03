import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.0.0.2", "localhost", "127.0.0.1"],
  serverExternalPackages: ["pdfjs-dist"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" }
    ]
  },
  async redirects() {
    return [
      {
        source: "/knowledge",
        destination: "/blog",
        permanent: true
      },
      {
        source: "/knowledge/:slug",
        destination: "/blog/:slug",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/og-image.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/favicon-16x16.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/favicon-32x32.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/favicon-48x48.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/apple-touch-icon.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/sa-icon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/android-chrome-192x192.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/android-chrome-512x512.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/site.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" }]
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" }]
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" }]
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" }]
      },
      {
        source: "/humans.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" }]
      }
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
