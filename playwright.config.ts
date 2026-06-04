import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    video: 'on',
    trace: 'on-first-retry',
    locale: 'ko-KR',
  },
  projects: [
    // 유저/비회원 시나리오 — 모바일 (Chromium 390×844)
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
      testMatch: ['**/guest/**', '**/user/**', '**/edge/**'],
    },
    // 관리자 시나리오 — 데스크탑 (1280×800)
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testMatch: ['**/admin/**'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
