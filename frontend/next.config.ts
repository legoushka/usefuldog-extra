import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const pythonBackendUrl =
      process.env.PYTHON_BACKEND_URL || "http://python-backend:8001"
    return [
      {
        source: "/api/tools/vex/:path*",
        destination: `${pythonBackendUrl}/api/:path*`,
      },
      {
        source: "/api/tools/sbom/:path*",
        destination: `${pythonBackendUrl}/api/sbom/:path*`,
      },
      {
        source: "/api/projects/:path*",
        destination: `${pythonBackendUrl}/api/projects/:path*`,
      },
    ]
  },
}

export default nextConfig
