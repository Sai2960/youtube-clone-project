import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  
  // ✅ DISABLE FAST REFRESH COMPLETELY
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: ['localhost:3000', '192.168.0.181:3000'],
    },
  },
  
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.181:5000',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://192.168.0.181:5000',
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://192.168.0.181:3000',
  },
  
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  
  webpack: (config, { isServer, dev, webpack }) => {
    if (dev) {
      // ✅ CRITICAL: Disable file watching entirely
      config.watchOptions = {
        ignored: /.*/,  // Ignore everything
      };

      // ✅ Disable HMR
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'HotModuleReplacementPlugin'
      );
      
      config.cache = false;
    }
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  images: {
    domains: [
      'localhost',
      '192.168.0.181',
      'github.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.0.181',
        port: '5000',
        pathname: '/uploads/**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://192.168.0.181:5000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { 
            key: 'Access-Control-Allow-Headers', 
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' 
          },
        ],
      },
    ];
  },
};

export default nextConfig;