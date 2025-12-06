import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://youtube-clone-project-q3pd.onrender.com',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://youtube-clone-project-q3pd.onrender.com',
    NEXT_PUBLIC_DEFAULT_AVATAR: 'https://res.cloudinary.com/dxuxxk0ss/image/upload/v1/youtube-clone/avatars/default-avatar.png',
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Optimize build
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };
    
    return config;
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'youtube-clone-project-q3pd.onrender.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  
  // Optimize output
  output: 'standalone',
  // swcMinify is removed - it's enabled by default in Next.js 15
  
  // Type checking configuration
  typescript: {
    // Set to true to skip type checking during build if needed
    ignoreBuildErrors: false,
  },
  
  eslint: {
    // Set to true to skip linting during build if needed
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;