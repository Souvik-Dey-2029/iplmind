/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Ensures standard configuration across deployments
  reactStrictMode: true,
  // Disable powered by header for security
  poweredByHeader: false,
  serverExternalPackages: ['firebase'],
  async headers() {
    return [
      {
        // match all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // Can be restricted in production
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default nextConfig;
