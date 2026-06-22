// 지원 로케일 정의 (KAN-264). 기본은 한국어.
export const locales = ['ko', 'en', 'ja', 'zh', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ko'

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}
