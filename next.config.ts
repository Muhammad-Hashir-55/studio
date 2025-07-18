import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

async function setup() {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
    const { downloadFont } = await import('./src/app/actions');
    await downloadFont();
  }
  return nextConfig;
}

export default setup();
