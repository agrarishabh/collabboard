import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return [
      { source: "/api/health", destination: `${apiUrl}/api/health` },
      { source: "/api/workspaces", destination: `${apiUrl}/api/workspaces` },
      { source: "/api/workspaces/:path*", destination: `${apiUrl}/api/workspaces/:path*` },
      { source: "/api/boards", destination: `${apiUrl}/api/boards` },
      { source: "/api/boards/:path*", destination: `${apiUrl}/api/boards/:path*` },
      { source: "/api/tasks", destination: `${apiUrl}/api/tasks` },
      { source: "/api/tasks/:path*", destination: `${apiUrl}/api/tasks/:path*` },
      { source: "/api/projects", destination: `${apiUrl}/api/projects` },
      { source: "/api/projects/:path*", destination: `${apiUrl}/api/projects/:path*` },
      { source: "/api/comments", destination: `${apiUrl}/api/comments` },
      { source: "/api/comments/:path*", destination: `${apiUrl}/api/comments/:path*` },
      { source: "/api/documents", destination: `${apiUrl}/api/documents` },
      { source: "/api/documents/:path*", destination: `${apiUrl}/api/documents/:path*` },
      { source: "/api/chat", destination: `${apiUrl}/api/chat` },
      { source: "/api/chat/:path*", destination: `${apiUrl}/api/chat/:path*` },
      { source: "/api/columns", destination: `${apiUrl}/api/columns` },
      { source: "/api/columns/:path*", destination: `${apiUrl}/api/columns/:path*` },
      { source: "/socket.io/:path*", destination: `${apiUrl}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
