import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude async_hooks from the client build
      config.resolve.alias['async_hooks'] = false;
    }

    return config;
  },
};

export default nextConfig;
