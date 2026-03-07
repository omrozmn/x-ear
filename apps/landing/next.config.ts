import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: process.env.PAGES_BASE_PATH || "",
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
