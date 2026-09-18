import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep whatsapp-web.js and Puppeteer in the Node.js runtime. Bundling it
  // makes Next/Turbopack try to resolve optional unzipper AWS adapters.
  serverExternalPackages: ["whatsapp-web.js", "puppeteer", "@puppeteer/browsers"],
};

export default nextConfig;
