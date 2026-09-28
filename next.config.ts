import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // An unrelated package-lock.json sits in the home directory, which makes Next
  // infer the wrong workspace root and serve 404s. Pin the root explicitly.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
