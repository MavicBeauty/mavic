/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  i18n: {
    locales: ['es', 'ca'],
    defaultLocale: 'es',
  },
};

module.exports = nextConfig;
