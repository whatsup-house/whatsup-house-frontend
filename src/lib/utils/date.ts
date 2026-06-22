import dayjs from 'dayjs'

const LOCALE_MAP = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
  es: 'es-ES',
} as const

export type AppLocale = keyof typeof LOCALE_MAP

function intlLocale(locale: string): string {
  return LOCALE_MAP[locale as AppLocale] ?? LOCALE_MAP.ko
}

export function formatLocalizedShortDate(date: string, locale: string): string {
  const d = dayjs(date)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(d.toDate())
}

export function formatLocalizedFullDate(date: string, locale: string): string {
  const d = dayjs(date)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(d.toDate())
}

export function formatLocalizedNumericDate(date: string, locale: string): string {
  const d = dayjs(date)
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(d.toDate())
}

export function formatKoreanShortDate(date: string): string {
  return formatLocalizedShortDate(date, 'ko')
}

export function formatKoreanFullDate(date: string): string {
  return formatLocalizedFullDate(date, 'ko')
}

export function formatKoreanNumericDate(date: string): string {
  return formatLocalizedNumericDate(date, 'ko')
}

// 생년월일(YYYY-MM-DD) 기준 만 나이를 계산한다. 유효하지 않으면 NaN.
export function getAge(birthDate: string): number {
  const birth = dayjs(birthDate)
  if (!birth.isValid()) return NaN
  return dayjs().diff(birth, 'year')
}

export function formatTime(time: string | null | undefined): string {
  return time?.slice(0, 5) ?? ''
}

export function formatTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  const start = formatTime(startTime)
  const end = formatTime(endTime)
  if (!start && !end) return ''
  if (!end) return start
  if (!start) return end
  return `${start} - ${end}`
}

export function getDurationParts(startTime: string | null | undefined, endTime: string | null | undefined): { hours: number; minutes: number } | null {
  if (!startTime || !endTime) return null

  const startMinutes = parseInt(startTime.slice(0, 2), 10) * 60 + parseInt(startTime.slice(3, 5), 10)
  const endMinutes = parseInt(endTime.slice(0, 2), 10) * 60 + parseInt(endTime.slice(3, 5), 10)
  const durationMinutes = endMinutes - startMinutes

  if (durationMinutes <= 0) return null

  return {
    hours: Math.floor(durationMinutes / 60),
    minutes: durationMinutes % 60,
  }
}
