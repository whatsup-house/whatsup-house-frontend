import dayjs from 'dayjs'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const FULL_WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function formatKoreanShortDate(date: string): string {
  const d = dayjs(date)
  return `${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})`
}

export function formatKoreanFullDate(date: string): string {
  const d = dayjs(date)
  return `${d.year()}년 ${d.month() + 1}월 ${d.date()}일 ${FULL_WEEKDAYS[d.day()]}`
}

export function formatKoreanNumericDate(date: string): string {
  const d = dayjs(date)
  return `${d.year()}. ${String(d.month() + 1).padStart(2, '0')}. ${String(d.date()).padStart(2, '0')} (${WEEKDAYS[d.day()]})`
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

export function formatDuration(startTime: string | null | undefined, endTime: string | null | undefined): string {
  if (!startTime || !endTime) return ''

  const startMinutes = parseInt(startTime.slice(0, 2), 10) * 60 + parseInt(startTime.slice(3, 5), 10)
  const endMinutes = parseInt(endTime.slice(0, 2), 10) * 60 + parseInt(endTime.slice(3, 5), 10)
  const durationMinutes = endMinutes - startMinutes

  if (durationMinutes <= 0) return ''

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`
}
