/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/api\/?$/, '') || '';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const rewrites = [{ source: '/api-backend/:path*', destination: 'http://localhost:8000/api/:path*' }];
    // Same-origin proxy: avoids cross-origin cookie blocking (Safari, Chrome)
    if (backendUrl && (backendUrl.startsWith('http://') || backendUrl.startsWith('https://'))) {
      rewrites.push({ source: '/api-proxy/:path*', destination: `${backendUrl}/api/:path*` });
    }
    return rewrites;
  },
};

module.exports = nextConfig;
