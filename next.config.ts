import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry 설정 (KAN-255). 소스맵 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 수행되며,
// 1차(토큰 미발급)에는 자동으로 건너뛴다.
export default withSentryConfig(nextConfig, {
  org: "whatsuphouse",
  project: "whatsuphouse",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
