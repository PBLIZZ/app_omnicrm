import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds - we'll run it separately
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "etdhqniblvwgueykywqd.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent client-side bundling of node: modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
