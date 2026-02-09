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
      // future: { source: '/api/tools/go/:path*', destination: 'http://go-backend:8002/api/:path*' }
    ]
  },
}

export default nextConfig
