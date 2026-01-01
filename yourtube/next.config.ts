/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  
  env: {
    // ✅ FIXED: Point to Render backend
    NEXT_PUBLIC_API_URL: 'https://youtube-clone-project-q3pd.onrender.com',
    NEXT_PUBLIC_BACKEND_URL: 'https://youtube-clone-project-q3pd.onrender.com',
    NEXT_PUBLIC_SOCKET_URL: 'https://youtube-clone-project-q3pd.onrender.com',
    NEXT_PUBLIC_DEFAULT_AVATAR: 'https://res.cloudinary.com/dxuxxk0ss/image/upload/v1/youtube-clone/avatars/default-avatar.png',
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
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'blob.vercel-storage.com',
      },
    ],
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
    return config;
  },
};

module.exports = nextConfig;