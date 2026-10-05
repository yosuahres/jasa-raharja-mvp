import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs .next/standalone/server.js (see Dockerfile).
  output: "standalone",
  experimental: {
    // Going back to a page seen in the last 30 seconds shows it at once instead of asking the server again.
    // Saving a document (revalidatePath) or router.refresh() clears this, so edits still show straight away.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
