'use client'

import { useState } from 'react'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import type { DiningApplicant, DiningPaymentStatus, MatchStatus } from '@/lib/api/types'
import {
  useDiningApplicants,
  useDiningSessionNotices,
  useDiningTableExplanation,
  useDiningTables,
} from '@/lib/hooks/useAdminDining'
import { MATCH_STATUS_LABEL, PAYMENT_STATUS_LABEL, UNASSIGNED_REASON_LABEL, tableLabel } from '@/lib/utils/diningStatus'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, LoadingSpinner } from '@/components/ui'
import DiningMatchGraph from './DiningMatchGraph'
import DiningTableExplanationModal from './DiningTableExplanationModal'

// 이 파일은 DiningSessionConsole 이 dynamic(ssr: false)로만 불러온다 — 캔버스와 CSS 변수를 브라우저에서 읽는다.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip)

// 매칭 점수 기준선 (0~1 = 0~100점)
const SCORE_LINE = 0.7

// 차트 색은 globals.css 토큰을 런타임에 읽는다. 범례 점은 같은 토큰의 Tailwind 클래스.
type Tone = 'primary' | 'primaryLight' | 'green' | 'tagText' | 'tagBg' | 'foreground'
const TONE_VAR: Record<Tone | 'card', string> = {
  primary: '--color-primary',
  primaryLight: '--color-primary-light',
  green: '--color-mileage-earn',
  tagText: '--color-tag-text',
  tagBg: '--color-tag-bg',
  foreground: '--color-foreground',
  card: '--color-card',
}
const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-primary',
  primaryLight: 'bg-primary-light',
  green: 'bg-mileage-earn',
  tagText: 'bg-tag-text',
  tagBg: 'bg-tag-bg',
  foreground: 'bg-foreground',
}
type Theme = Record<Tone | 'card', string>

function readTheme(): Theme {
  const root = getComputedStyle(document.documentElement)
  ChartJS.defaults.font.family = getComputedStyle(document.body).fontFamily
  return Object.fromEntries(Object.entries(TONE_VAR).map(([tone, name]) => [tone, root.getPropertyValue(name).trim()])) as Theme
}

// 막대 끝에 값을 크게 쓴다(축·범례 대신).
const valueLabels = (color: string): Plugin<'bar'> => ({
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    const horizontal = chart.options.indexAxis === 'y'
    ctx.save()
    ctx.fillStyle = color
    ctx.font = `700 14px ${ChartJS.defaults.font.family}`
    ctx.textAlign = horizontal ? 'left' : 'center'
    ctx.textBaseline = horizontal ? 'middle' : 'bottom'
    chart.data.datasets.forEach((dataset, i) => {
      chart.getDatasetMeta(i).data.forEach((bar, j) => {
        const value = dataset.data[j]
        if (typeof value === 'number') ctx.fillText(String(value), horizontal ? bar.x + 6 : bar.x, horizontal ? bar.y : bar.y - 4)
      })
    })
    ctx.restore()
  },
})

// 세로 막대 차트의 기준선(점선 + 값)
const thresholdLine = (value: number, color: string): Plugin<'bar'> => ({
  id: 'thresholdLine',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart
    const y = chart.scales.y.getPixelForValue(value)
    ctx.save()
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()
    ctx.font = `700 11px ${ChartJS.defaults.font.family}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(String(value), chartArea.right, y - 2)
    ctx.restore()
  },
})

interface BarSeries {
  label: string
  data: number[]
  color: string | string[]
}

interface BarChartProps {
  theme: Theme
  labels: string[]
  series: BarSeries[]
  horizontal?: boolean
  max?: number
  threshold?: number
}

function BarChart({ theme, labels, series, horizontal = false, max, threshold }: BarChartProps) {
  // react-chartjs-2 는 plugins 를 처음 그릴 때만 쓴다
  const [plugins] = useState(() => [valueLabels(theme.foreground), ...(threshold === undefined ? [] : [thresholdLine(threshold, theme.foreground)])])
  const data: ChartData<'bar'> = {
    labels,
    datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.color, borderRadius: 6, maxBarThickness: 36 })),
  }
  const valueAxis = { display: false, beginAtZero: true, max, grace: max === undefined ? '12%' : 0 }
  const labelAxis = {
    grid: { display: false },
    border: { display: false },
    ticks: { color: theme.tagText, font: { size: 12, weight: 600 } },
  }
  const options: ChartOptions<'bar'> = {
    indexAxis: horizontal ? 'y' : 'x',
    maintainAspectRatio: false,
    layout: { padding: horizontal ? { right: 32 } : { top: 20 } },
    plugins: { legend: { display: false } },
    scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis },
  }
  return <Bar data={data} options={options} plugins={plugins} />
}

interface Slice {
  label: string
  value: number
  tone: Tone
}

interface DonutChartProps {
  theme: Theme
  slices: Slice[]
  center: string
  caption: string
  isCenterAlert?: boolean
}

function DonutChart({ theme, slices, center, caption, isCenterAlert }: DonutChartProps) {
  const data: ChartData<'doughnut'> = {
    labels: slices.map((s) => s.label),
    datasets: [{ data: slices.map((s) => s.value), backgroundColor: slices.map((s) => theme[s.tone]), borderColor: theme.card, borderWidth: 2 }],
  }
  const options: ChartOptions<'doughnut'> = { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
  return (
    <div className="flex flex-1 items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <Doughnut data={data} options={options} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold leading-none ${isCenterAlert ? 'text-primary' : 'text-foreground'}`}>{center}</span>
          <span className="mt-1 text-xs text-tag-text">{caption}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-tag-text">{s.label}</span>
            <span className="font-bold text-foreground">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface LegendDotsProps {
  items: { label: string; tone: Tone }[]
}

function LegendDots({ items }: LegendDotsProps) {
  return (
    <ul className="mb-2 flex flex-wrap gap-3 text-xs text-tag-text">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

interface ChartCardProps {
  title: string
  emptyLabel: string
  isEmpty: boolean
  className?: string
  children: React.ReactNode
}

function ChartCard({ title, emptyLabel, isEmpty, className, children }: ChartCardProps) {
  return (
    <section className={`flex flex-col rounded-card bg-card p-4 shadow-sm ${className ?? ''}`}>
      <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
      {isEmpty ? <p className="flex flex-1 items-center justify-center py-8 text-sm text-tag-text">{emptyLabel}</p> : children}
    </section>
  )
}

// 같은 그룹은 같은 색: 확정 초록 · 진행 빨강 · 대기 갈색 · 문제 검정 · 결제 전 연회색
const MATCH_ORDER: (MatchStatus | null)[] = [
  'CONFIRMED', 'CONFIRM_PENDING', 'MATCHING', 'REALLOCATING', 'WAITING', 'TRANSFERRED', 'ALTERNATIVE_OFFERED', 'NO_MATCH', 'EXCEPTION', null,
]
const MATCH_TONE: Record<MatchStatus, Tone> = {
  CONFIRMED: 'green',
  CONFIRM_PENDING: 'primary',
  MATCHING: 'primary',
  REALLOCATING: 'tagText',
  WAITING: 'tagText',
  TRANSFERRED: 'tagText',
  ALTERNATIVE_OFFERED: 'foreground',
  NO_MATCH: 'foreground',
  EXCEPTION: 'foreground',
}

const PAYMENT_ORDER: DiningPaymentStatus[] = [
  'PAID', 'PENDING', 'FAILED', 'REFUND_FAILED', 'REFUND_AVAILABLE', 'REFUND_REQUESTED', 'REFUND_PROCESSING', 'REFUNDED',
]
const PAYMENT_TONE: Record<DiningPaymentStatus, Tone> = {
  PAID: 'green',
  PENDING: 'tagText',
  FAILED: 'primary',
  REFUND_FAILED: 'primary',
  REFUND_AVAILABLE: 'primaryLight',
  REFUND_REQUESTED: 'primaryLight',
  REFUND_PROCESSING: 'primaryLight',
  REFUNDED: 'tagBg',
}

// 구형 BE 응답엔 통합 결제 상태가 없다 → 이용권 차감 여부로 본다
const paymentOf = (a: DiningApplicant): DiningPaymentStatus => a.paymentStatus ?? (a.isPaid ? 'PAID' : 'PENDING')

// 나이는 신청 답변 원문. 출생연도로 적혀 있으면 나이로 바꾼다(테이블 ageMin·ageMax 와 같은 연도 차 기준).
const ageOf = (raw: string | null) => {
  const n = parseInt(raw ?? '', 10)
  if (Number.isNaN(n)) return null
  return n >= 1900 ? new Date().getFullYear() - n : n
}

const countBy = <T, K>(items: T[], keyOf: (item: T) => K) => {
  const counts = new Map<K, number>()
  items.forEach((item) => counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1))
  return counts
}

const percent = (value: number) => `${Math.round(value * 100)}%`

interface TableChemistryCardProps {
  sessionId: string
  tableId: string
  region: string | null
  groupScore: number | null
  onOpen: () => void
}

// 테이블 궁합 카드: 라벨·지역·종합 점수 + 직업 캐릭터 궁합 그래프. 누르면 매칭 근거 모달
function TableChemistryCard({ sessionId, tableId, region, groupScore, onOpen }: TableChemistryCardProps) {
  const { data, isLoading, isError } = useDiningTableExplanation(sessionId, tableId)
  const score = data?.groupScore ?? groupScore
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col rounded-card border border-transparent bg-card p-4 text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block font-bold text-foreground">{tableLabel(tableId)}</span>
          {(data?.region ?? region) && <span className="block truncate text-sm text-tag-text">{data?.region ?? region}</span>}
        </span>
        <span className={`text-3xl font-bold ${score !== null && score >= SCORE_LINE ? 'text-primary' : 'text-foreground'}`}>
          {score === null ? '-' : percent(score)}
        </span>
      </span>
      <span className="mt-2 flex w-full flex-1 items-center justify-center">
        {isLoading ? (
          <LoadingSpinner />
        ) : isError || !data ? (
          <span className="py-8 text-sm text-tag-text">궁합 정보 없음</span>
        ) : (
          <DiningMatchGraph members={data.members} pairs={data.pairs} />
        )}
      </span>
    </button>
  )
}

interface DiningSessionInsightsProps {
  sessionId: string
}

// 회차 한눈에 보기 (KAN-441): 신청자·테이블·안내 이력을 FE 에서 집계한 인포그래픽 + 테이블 궁합
export default function DiningSessionInsights({ sessionId }: DiningSessionInsightsProps) {
  const [theme] = useState(readTheme)
  const [openTableId, setOpenTableId] = useState<string | null>(null)
  const applicantsQuery = useDiningApplicants(sessionId)
  const tablesQuery = useDiningTables(sessionId)
  const noticesQuery = useDiningSessionNotices(sessionId)

  if (applicantsQuery.isLoading || tablesQuery.isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>
  if (!applicantsQuery.data || !tablesQuery.data) {
    return (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(applicantsQuery.error ?? tablesQuery.error, '한눈에 보기를 불러오지 못했어요.')}
        onRetry={() => {
          applicantsQuery.refetch()
          tablesQuery.refetch()
        }}
      />
    )
  }

  const applicants = applicantsQuery.data
  const { tables, unassigned, regionResults = [] } = tablesQuery.data
  // BE 머지 전(404)이면 이력 없음으로 본다
  const notices = noticesQuery.data ?? []

  const memberCount = tables.reduce((sum, t) => sum + t.members.length, 0)
  const confirmedMemberCount = tables
    .filter((t) => t.status === 'CONFIRMED' || t.status === 'DONE')
    .reduce((sum, t) => sum + t.members.length, 0)
  const paidCount = applicants.filter((a) => paymentOf(a) === 'PAID').length

  const matchCounts = countBy(applicants, (a) => a.matchStatus)
  const matchSlices = MATCH_ORDER.flatMap((status): Slice[] => {
    const value = matchCounts.get(status) ?? 0
    if (value === 0) return []
    return [status ? { label: MATCH_STATUS_LABEL[status], value, tone: MATCH_TONE[status] } : { label: '결제 전', value, tone: 'tagBg' }]
  })

  const paymentCounts = countBy(applicants, paymentOf)
  const paymentSlices = PAYMENT_ORDER.flatMap((status): Slice[] => {
    const value = paymentCounts.get(status) ?? 0
    return value > 0 ? [{ label: PAYMENT_STATUS_LABEL[status], value, tone: PAYMENT_TONE[status] }] : []
  })

  // 지역별: 신청 = 그 지역을 희망한 신청자(지망 무관), 테이블 = 그 지역 테이블. 마지막 매칭에서 미채택이면 갈색
  const regions = new Map<string, { applicants: number; tables: number; adopted: boolean }>()
  const regionOf = (region: string) => {
    if (!regions.has(region)) regions.set(region, { applicants: 0, tables: 0, adopted: true })
    return regions.get(region)!
  }
  applicants.forEach((a) => a.candidateRegions?.forEach((region) => regionOf(region).applicants++))
  tables.forEach((t) => {
    if (t.region) regionOf(t.region).tables++
  })
  regionResults.forEach((r) => {
    regionOf(r.region).adopted = r.adopted
  })
  const regionRows = [...regions].sort((a, b) => b[1].applicants - a[1].applicants)
  const hasRejectedRegion = regionRows.some(([, r]) => !r.adopted)

  const genderCounts = countBy(applicants, (a) => a.gender)
  const male = genderCounts.get('MALE') ?? 0
  const female = genderCounts.get('FEMALE') ?? 0
  const genderSlices: Slice[] = [
    { label: '남', value: male, tone: 'tagText' },
    { label: '여', value: female, tone: 'primary' },
    { label: '미상', value: applicants.length - male - female, tone: 'tagBg' },
  ].filter((s): s is Slice => s.value > 0)

  // 5살 단위, 빈 구간도 이어서 보여 준다
  const ages = applicants.map((a) => ageOf(a.age)).filter((age): age is number => age !== null)
  const bandCounts = countBy(ages, (age) => Math.floor(age / 5) * 5)
  const firstBand = Math.min(...bandCounts.keys())
  const bands = ages.length === 0 ? [] : Array.from({ length: (Math.max(...bandCounts.keys()) - firstBand) / 5 + 1 }, (_, i) => firstBand + i * 5)

  const scoredTables = tables.filter((t) => t.groupScore !== null)
  const scores = scoredTables.map((t) => Math.round((t.groupScore ?? 0) * 100))

  const reasonRows = [...countBy(unassigned, (u) => u.reason)].sort((a, b) => b[1] - a[1])

  const noticeFailed = notices.filter((n) => n.status === 'FAILED').length
  const noticeSlices: Slice[] = [
    { label: '성공', value: notices.length - noticeFailed, tone: 'green' },
    { label: '실패', value: noticeFailed, tone: 'primary' },
  ].filter((s): s is Slice => s.value > 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="신청 퍼널" emptyLabel="신청자 없음" isEmpty={applicants.length === 0} className="md:col-span-2">
          <div className="relative h-44">
            <BarChart
              theme={theme}
              horizontal
              labels={['신청', '결제 완료', '매칭', '확정']}
              series={[{
                label: '인원',
                data: [applicants.length, paidCount, memberCount, confirmedMemberCount],
                color: [theme.primary, theme.primary, theme.primary, theme.green],
              }]}
            />
          </div>
        </ChartCard>

        <ChartCard title="매칭 상태" emptyLabel="신청자 없음" isEmpty={matchSlices.length === 0}>
          <DonutChart theme={theme} slices={matchSlices} center={String(matchCounts.get('CONFIRMED') ?? 0)} caption="확정" />
        </ChartCard>

        <ChartCard title="결제 상태" emptyLabel="신청자 없음" isEmpty={paymentSlices.length === 0}>
          <DonutChart theme={theme} slices={paymentSlices} center={String(paidCount)} caption="결제 완료" />
        </ChartCard>

        <ChartCard title="지역별 신청·테이블" emptyLabel="지역 정보 없음" isEmpty={regionRows.length === 0} className="md:col-span-2">
          <LegendDots
            items={[
              { label: '신청', tone: 'primary' },
              { label: '테이블', tone: 'green' },
              ...(hasRejectedRegion ? [{ label: '미채택', tone: 'tagText' as const }] : []),
            ]}
          />
          <div className="relative h-44">
            <BarChart
              theme={theme}
              labels={regionRows.map(([region]) => region)}
              series={[
                { label: '신청', data: regionRows.map(([, r]) => r.applicants), color: regionRows.map(([, r]) => (r.adopted ? theme.primary : theme.tagText)) },
                { label: '테이블', data: regionRows.map(([, r]) => r.tables), color: regionRows.map(([, r]) => (r.adopted ? theme.green : theme.tagText)) },
              ]}
            />
          </div>
        </ChartCard>

        <ChartCard title="성비" emptyLabel="신청자 없음" isEmpty={genderSlices.length === 0}>
          <DonutChart theme={theme} slices={genderSlices} center={String(applicants.length)} caption="명" />
        </ChartCard>

        <ChartCard title="나이" emptyLabel="나이 정보 없음" isEmpty={bands.length === 0}>
          <div className="relative h-40">
            <BarChart
              theme={theme}
              labels={bands.map((band) => `${band}~${band + 4}`)}
              series={[{ label: '인원', data: bands.map((band) => bandCounts.get(band) ?? 0), color: theme.tagText }]}
            />
          </div>
        </ChartCard>

        <ChartCard title="테이블 점수" emptyLabel="테이블 없음" isEmpty={scoredTables.length === 0} className="md:col-span-2">
          <div className="relative h-44">
            <BarChart
              theme={theme}
              labels={scoredTables.map((t) => tableLabel(t.id))}
              max={100}
              threshold={SCORE_LINE * 100}
              series={[{ label: '점수', data: scores, color: scores.map((s) => (s >= SCORE_LINE * 100 ? theme.primary : theme.tagText)) }]}
            />
          </div>
        </ChartCard>

        <ChartCard title="미배정 사유" emptyLabel="미배정 없음" isEmpty={reasonRows.length === 0}>
          <div className="relative h-40">
            <BarChart
              theme={theme}
              horizontal
              labels={reasonRows.map(([reason]) => UNASSIGNED_REASON_LABEL[reason] ?? reason)}
              series={[{ label: '인원', data: reasonRows.map(([, count]) => count), color: theme.primary }]}
            />
          </div>
        </ChartCard>

        <ChartCard title="안내 발송" emptyLabel="안내 이력 없음" isEmpty={!noticesQuery.isLoading && noticeSlices.length === 0}>
          {noticesQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>
          ) : (
            <DonutChart
              theme={theme}
              slices={noticeSlices}
              center={String(noticeFailed)}
              caption="실패"
              isCenterAlert={noticeFailed > 0}
            />
          )}
        </ChartCard>
      </div>

      <section>
        <h3 className="mb-3 text-base font-bold text-foreground">테이블 궁합</h3>
        {tables.length === 0 ? (
          <div className="rounded-card bg-card py-10 text-center text-sm text-tag-text shadow-sm">테이블 없음</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((t) => (
              <li key={t.id}>
                <TableChemistryCard
                  sessionId={sessionId}
                  tableId={t.id}
                  region={t.region ?? null}
                  groupScore={t.groupScore}
                  onOpen={() => setOpenTableId(t.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {openTableId && (
        <DiningTableExplanationModal sessionId={sessionId} tableId={openTableId} onClose={() => setOpenTableId(null)} />
      )}
    </div>
  )
}
