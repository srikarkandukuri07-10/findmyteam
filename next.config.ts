import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // D25: Google is the only sign-in, so the old password pages point at the login page.
  async redirects() {
    return ["/signup", "/forgot-password", "/reset-password"].map((source) => ({
      source,
      destination: "/login",
      permanent: false,
    }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
