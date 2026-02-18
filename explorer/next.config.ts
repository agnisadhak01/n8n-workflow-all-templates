import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Use explorer directory as project root so module resolution uses explorer/node_modules
    // (avoids "Can't resolve 'tailwindcss'" when build runs from repo root or with multiple lockfiles)
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
