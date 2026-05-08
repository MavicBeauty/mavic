/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cjqmterrgrthhpxmaoxc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  i18n: {
    locales: ['es', 'ca'],
    defaultLocale: 'es',
  },
};

module.exports = nextConfig;
