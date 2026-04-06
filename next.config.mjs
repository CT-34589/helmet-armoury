/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ]
  },
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
   allowedDevOrigins: ['192.168.1.159', 'localhost'],
};

export default nextConfig;
