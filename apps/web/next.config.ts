import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@cyberskill/amlich-core", "@cyberskill/genie-ui", "@cyberskill/genie-content"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"]
    };
    return config;
  },
};

export default nextConfig;
