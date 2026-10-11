import type { NextConfig } from "next";

// Static export for GitHub Pages: the build is plain HTML/JS in `out/`,
// and the browser talks to Supabase directly (RLS protects the data).
// BASE_PATH is set by the Pages workflow to "/ecommerce-pos-accounting";
// it stays empty for local dev and other hosts.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
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
