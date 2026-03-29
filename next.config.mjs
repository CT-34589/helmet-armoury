/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'media.discordapp.net' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
    // Allow local /uploads/** paths served statically from public/
    localPatterns: [
      { pathname: '/uploads/**' },
      { pathname: '/**'},
    ],
  },
   allowedDevOrigins: ['192.168.1.159'],
};

export default nextConfig;
