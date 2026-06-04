import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      // 프로덕션 HTTPS 이미지 (S3, CDN 등)
      { protocol: 'https', hostname: '**' },
      // 로컬 개발 백엔드
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
