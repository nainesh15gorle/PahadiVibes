import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      buffer: false,
    };
    return config;
  },
};

export default nextConfig;
