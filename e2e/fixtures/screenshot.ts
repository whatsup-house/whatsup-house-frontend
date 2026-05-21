import type { Page, PageScreenshotOptions } from '@playwright/test'

type FullPageScreenshotOptions = Omit<PageScreenshotOptions, 'path' | 'fullPage'>

const FULL_PAGE_STABILIZER_CSS = `
  *,
  *::before,
  *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }

  html {
    scroll-behavior: auto !important;
  }

  @media (max-width: 500px) {
    header.sticky,
    nav.sticky {
      position: static !important;
      top: auto !important;
      bottom: auto !important;
      transform: none !important;
    }

    [class~="fixed"][class~="bottom-0"][class*="-translate-x-1/2"] {
      position: static !important;
      left: auto !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  }
`

export async function captureFullPage(
  page: Page,
  path: string,
  options: FullPageScreenshotOptions = {},
) {
  const styleHandle = await page.addStyleTag({ content: FULL_PAGE_STABILIZER_CSS })

  try {
    await page.screenshot({
      path,
      fullPage: true,
      animations: 'disabled',
      ...options,
    })
  } finally {
    await styleHandle.evaluate((node) => node.remove()).catch(() => {})
  }
}
