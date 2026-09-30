'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { DiningVenue, DiningVenueRequest } from '@/lib/api/types'
import { useDeleteDiningVenue, useDiningVenues, useSaveDiningVenue } from '@/lib/hooks/useAdminDiningOps'
import { getAdminApiErrorMessage } from '@/lib/utils/apiError'
import { ApiErrorMessage, Button, Input, LoadingSpinner } from '@/components/ui'

// 길이·형식은 BE VenueRequest 검증과 같다. 지도 링크는 화면에서 링크로 열리므로 http(s)만.
const schema = z.object({
  name: z.string().trim().min(1, '식당 이름을 입력해주세요').max(100, '100자 이하로 입력해주세요'),
  address: z.string().trim().min(1, '주소를 입력해주세요').max(255, '255자 이하로 입력해주세요'),
  mapUrl: z
    .string()
    .trim()
    .max(500, '500자 이하로 입력해주세요')
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), '지도 링크는 http(s) 주소여야 합니다'),
  priceRange: z.string().trim().max(50, '50자 이하로 입력해주세요'),
  region: z.string().trim().min(1, '지역을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const REGION_LIST_ID = 'dining-venue-regions'

interface VenueFormModalProps {
  // 수정할 식당. null이면 추가
  editing: { venueId: string; values: DiningVenueRequest } | null
  regions: string[]
  onClose: () => void
}

function VenueFormModal({ editing, regions, onClose }: VenueFormModalProps) {
  const { mutate, isPending } = useSaveDiningVenue(onClose)
  const initial = editing?.values
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      address: initial?.address ?? '',
      mapUrl: initial?.mapUrl ?? '',
      priceRange: initial?.priceRange ?? '',
      region: initial?.region ?? '',
      isActive: initial?.isActive ?? true,
    },
  })

  // 빈 선택 항목은 null로 보낸다.
  const onSubmit = (v: FormValues) =>
    mutate({ id: editing?.venueId, data: { ...v, mapUrl: v.mapUrl || null, priceRange: v.priceRange || null } })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-tag-bg px-5 py-4">
          <h3 className="text-base font-bold text-foreground">{editing ? '식당 수정' : '식당 추가'}</h3>
          <button type="button" onClick={onClose} className="text-tag-text hover:text-foreground" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-col">
          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            <Input label="식당 이름 *" error={errors.name?.message} {...register('name')} />
            <Input label="주소 *" error={errors.address?.message} {...register('address')} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="지역 *"
                list={REGION_LIST_ID}
                placeholder="을지로"
                error={errors.region?.message}
                {...register('region')}
              />
              <Input label="가격대" placeholder="1~2만원" error={errors.priceRange?.message} {...register('priceRange')} />
            </div>
            <datalist id={REGION_LIST_ID}>
              {regions.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <Input label="지도 링크" placeholder="https://naver.me/..." error={errors.mapUrl?.message} {...register('mapUrl')} />
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input type="checkbox" className="h-4 w-4 accent-primary" {...register('isActive')} />
              활성 (비활성 식당은 새로 배정할 수 없어요)
            </label>
          </div>

          <div className="flex gap-3 border-t border-tag-bg px-5 py-4">
            <Button variant="ghost" type="button" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button variant="primary" type="submit" isLoading={isPending} className="flex-1">
              저장하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

type ModalState = { venueId: string; values: DiningVenueRequest } | 'new' | null

const toEditing = ({ id, ...values }: DiningVenue) => ({ venueId: id, values })

// 식당 풀 CRUD + 지역 필터 (KAN-353)
export default function DiningVenuePool() {
  const venuesQuery = useDiningVenues()
  const deleteVenue = useDeleteDiningVenue()
  const [region, setRegion] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  const venues = venuesQuery.data ?? []
  // 서버가 지역·이름 순으로 주므로 첫 등장 순서가 곧 정렬 순서다.
  const regions = [...new Set(venues.map((v) => v.region))]
  // 삭제·수정으로 선택한 지역이 사라지면 전체로 본다.
  const activeRegion = regions.includes(region) ? region : ''
  const filtered = activeRegion ? venues.filter((v) => v.region === activeRegion) : venues

  const handleDelete = (venue: DiningVenue) => {
    if (confirm(`"${venue.name}" 식당을 삭제할까요? 이미 배정된 회차·테이블은 그대로 두고 새 배정만 막아요.`)) {
      deleteVenue.mutate(venue.id)
    }
  }

  let content: ReactNode
  if (venuesQuery.isLoading) {
    content = (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  } else if (venuesQuery.isError) {
    content = (
      <ApiErrorMessage
        message={getAdminApiErrorMessage(venuesQuery.error, '식당 목록을 불러오지 못했어요.')}
        onRetry={() => venuesQuery.refetch()}
      />
    )
  } else if (filtered.length === 0) {
    content = <p className="p-10 text-center text-sm text-tag-text">등록된 식당이 없어요.</p>
  } else {
    content = (
      <ul className="divide-y divide-tag-bg">
        {filtered.map((v) => (
          <li key={v.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="break-all text-sm font-semibold text-foreground">{v.name}</p>
                <span className="rounded-full bg-tag-bg px-2 py-0.5 text-[11px] text-tag-text">{v.region}</span>
                {!v.isActive && (
                  <span className="rounded-full border border-tag-bg px-2 py-0.5 text-[11px] text-tag-text">비활성</span>
                )}
              </div>
              <p className="mt-1 break-words text-xs text-tag-text">
                {v.address}
                {v.priceRange && ` · ${v.priceRange}`}
              </p>
              {v.mapUrl && (
                <a
                  href={v.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary hover:underline"
                >
                  지도 보기
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button type="button" onClick={() => setModal(toEditing(v))} className="text-primary hover:underline">
                수정
              </button>
              <button
                type="button"
                onClick={() => handleDelete(v)}
                disabled={deleteVenue.isPending}
                className="text-tag-text hover:text-primary hover:underline disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="rounded-card bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-foreground">식당 풀 {venues.length > 0 && `${venues.length}곳`}</h2>
        <div className="flex gap-2">
          <select
            value={activeRegion}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="지역 필터"
            className="h-10 min-w-0 flex-1 rounded-input border border-tag-bg bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:flex-none"
          >
            <option value="">전체 지역</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setModal('new')}
            className="h-10 shrink-0 rounded-input bg-primary px-4 text-sm font-medium text-white hover:opacity-90"
          >
            + 식당 추가
          </button>
        </div>
      </div>
      {content}

      {modal && (
        <VenueFormModal
          // 대상이 바뀌면 새로 마운트해 이전 입력이 남지 않게 한다.
          key={modal === 'new' ? 'new' : modal.venueId}
          editing={modal === 'new' ? null : modal}
          regions={regions}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  )
}
