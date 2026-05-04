import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/explore",
        destination: "/references",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
