'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { AdminGatheringTypeRequest, GatheringDetail, GatheringType } from '@/lib/api/types'
import { useAdminGatheringDetail, useCreateGathering, useUpdateGathering, useSetCuration } from '@/lib/hooks/useAdminGathering'
import { useCuratedGatherings } from '@/lib/hooks/useHome'
import { useUploadImage } from '@/lib/hooks/useUploadImage'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ImageUploadField from '@/components/ui/ImageUploadField'

// 모임 종류 필드만 다룬다. 날짜·시간·장소·정원은 회차(GatheringSessionModal)에서 입력한다. (KAN-340)
const schema = z.object({
  title: z.string().min(1, '게더링명을 입력해주세요'),
  description: z.string().min(1, '게더링 소개를 입력해주세요'),
  howToRunText: z.string().optional(),
  basePrice: z.number({ error: '기본 참가비를 입력해주세요' }).min(0, '참가비는 0원 이상이어야 합니다'),
  tagsText: z.string().optional(),
  // 입금 계좌 (선택). 비우면 BE가 null로 저장하고 유저 화면은 폴백 계좌를 쓴다. (KAN-391)
  accountBank: z.string().max(50, '50자 이내로 입력해주세요').optional(),
  accountNumber: z.string().max(50, '50자 이내로 입력해주세요').optional(),
  accountHolder: z.string().max(50, '50자 이내로 입력해주세요').optional(),
}).superRefine((values, ctx) => {
  // 번호만 있으면 유저 화면에 폴백 은행명이 붙어 다른 은행으로 안내될 수 있다 — 번호를 넣으면 은행명도 받는다.
  if (values.accountNumber?.trim() && !values.accountBank?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['accountBank'], message: '계좌번호를 입력하면 은행명도 입력해주세요' })
  }
})

type FormValues = z.infer<typeof schema>

const MAX_DETAIL_IMAGES = 10

// 상세 사진 한 장 — value는 저장 요청에 보낼 값(새 사진은 tempPath, 남길 사진은 기존 URL)
interface DetailImage {
  previewUrl: string
  value: string
}

interface GatheringFormPanelProps {
  gatheringId: string | null   // null이면 새 종류 생성
  onClose: () => void
  onSuccess: (gatheringId: string) => void
}

export function GatheringFormPanel({ gatheringId, onClose, onSuccess }: GatheringFormPanelProps) {
  const isEdit = !!gatheringId

  const { data: detail } = useAdminGatheringDetail(gatheringId ?? undefined)
  const { uploadWithTempPath, isUploading } = useUploadImage('이미지 업로드에 실패했습니다')

  // 큐레이션 현재 값은 공개 큐레이션 목록(id = 대표 회차 ID)에서 파생한다. 바꿨을 때만 저장 후 반영한다. (KAN-190)
  const { data: curated = [] } = useCuratedGatherings()
  const initialCurated = !!detail && curated.some((c) => detail.sessions.some((s) => s.id === c.id))
  const [curatedChoice, setCuratedChoice] = useState<boolean | null>(null)
  const isCurated = curatedChoice ?? initialCurated
  const { mutate: setCuration } = useSetCuration()

  const handleSaved = (saved: GatheringDetail) => {
    if (curatedChoice !== null && curatedChoice !== initialCurated) {
      setCuration({ id: saved.id, isCurated: curatedChoice })
    }
    onSuccess(saved.id)
  }
  const { mutate: createGathering, isPending: isCreating } = useCreateGathering(handleSaved)
  const { mutate: updateGathering, isPending: isUpdating } = useUpdateGathering(handleSaved)
  const isPending = isCreating || isUpdating

  // 게더링 유형 (생성 시에만 설정 가능, 수정은 백엔드에서 무시)
  const [gatheringType, setGatheringType] = useState<GatheringType>('REGULAR')

  // 이번 편집에서 새로 올린 이미지만 상태로 들고, 표시할 썸네일은 파생시킨다.
  // tempPath가 없으면 수정 요청에서 thumbnailUrl을 생략해 백엔드가 기존 이미지를 유지한다.
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string | null>(null)
  const [thumbnailTempPath, setThumbnailTempPath] = useState<string | null>(null)
  const thumbnailPreviewUrl = newThumbnailUrl ?? detail?.thumbnailUrl ?? null

  // 상세 사진: 손대기 전(null)엔 서버 값을 보여주고 저장 요청에서 생략해 기존을 유지한다. (KAN-372)
  const [editedImages, setEditedImages] = useState<DetailImage[] | null>(null)
  const detailImages = editedImages ?? (detail?.imageUrls ?? []).map((url) => ({ previewUrl: url, value: url }))
  const [imageNotice, setImageNotice] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      basePrice: 0,
      howToRunText: '',
      tagsText: '',
      accountBank: '',
      accountNumber: '',
      accountHolder: '',
    },
  })

  // 수정 시 상세가 도착하면 종류 필드를 채운다. (KAN-220)
  useEffect(() => {
    if (!detail) return
    reset({
      title: detail.title,
      description: detail.description ?? '',
      howToRunText: detail.howToRun?.join('\n') ?? '',
      basePrice: detail.basePrice ?? 0,
      tagsText: detail.tags?.join(',') ?? '',
      accountBank: detail.accountBank ?? '',
      accountNumber: detail.accountNumber ?? '',
      accountHolder: detail.accountHolder ?? '',
    })
  }, [detail, reset])

  // 로컬 미리보기용 blob URL은 교체 시점과 언마운트 시점에 정리한다.
  useEffect(() => {
    if (!newThumbnailUrl?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(newThumbnailUrl)
  }, [newThumbnailUrl])

  // 크롭 완료 → 임시 업로드. 실패 시 기존 이미지로 되돌린다.
  const handleThumbnailConfirm = async (blob: Blob) => {
    // 업로드가 끝나기 전에도 크롭 결과를 즉시 보여준다.
    setNewThumbnailUrl(URL.createObjectURL(blob))

    try {
      const result = await uploadWithTempPath(blob, 'gathering.jpg', 'gathering')
      setNewThumbnailUrl(result.previewUrl)
      setThumbnailTempPath(result.tempPath)
    } catch {
      setNewThumbnailUrl(null)
      setThumbnailTempPath(null)
    }
  }

  // 새로 올린 이미지만 취소한다. 백엔드가 썸네일 삭제를 지원하지 않아 기존 이미지는 지울 수 없다.
  const handleThumbnailRevert = () => {
    setNewThumbnailUrl(null)
    setThumbnailTempPath(null)
  }

  const handleDetailImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    // 같은 파일 재선택 허용
    e.target.value = ''
    if (files.length === 0) return
    if (detailImages.length + files.length > MAX_DETAIL_IMAGES) {
      setImageNotice(`상세 사진은 최대 ${MAX_DETAIL_IMAGES}장까지 올릴 수 있어요. (지금 ${detailImages.length}장)`)
      return
    }
    setImageNotice(null)
    const startImages = detailImages
    let failed = 0
    // 업로드 훅의 isUploading이 하나라 순서대로 올린다. 업로드 중 삭제·이동도 반영되게 함수형으로 붙인다.
    for (const file of files) {
      try {
        const result = await uploadWithTempPath(file, file.name, 'gathering')
        setEditedImages((prev) => [...(prev ?? startImages), { previewUrl: result.previewUrl, value: result.tempPath }])
      } catch {
        failed += 1
      }
    }
    if (failed > 0) setImageNotice(`${failed}장 업로드에 실패했어요. 다시 시도해주세요.`)
  }

  const moveDetailImage = (index: number, delta: -1 | 1) => {
    const next = [...detailImages]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    setEditedImages(next)
  }

  const removeDetailImage = (index: number) => {
    setEditedImages(detailImages.filter((_, i) => i !== index))
    setImageNotice(null)
  }

  const onSubmit = (values: FormValues) => {
    const data: AdminGatheringTypeRequest = {
      title: values.title,
      description: values.description,
      basePrice: values.basePrice,
      // 새 이미지를 올렸을 때만 tempPath를 보낸다. 생략하면 백엔드가 기존 썸네일을 유지한다.
      thumbnailUrl: thumbnailTempPath ?? undefined,
      // 손댔을 때만 순서대로 보낸다. 생략하면 백엔드가 기존 상세 사진을 유지한다.
      imageUrls: editedImages?.map((image) => image.value),
      howToRun: values.howToRunText ? values.howToRunText.split('\n').filter(Boolean) : [],
      tags: values.tagsText ? values.tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [],
      accountBank: values.accountBank?.trim() ?? '',
      accountNumber: values.accountNumber?.trim() ?? '',
      accountHolder: values.accountHolder?.trim() ?? '',
    }

    if (gatheringId) {
      updateGathering({ id: gatheringId, data })
    } else {
      createGathering({ ...data, gatheringType })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-full bg-card shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <h2 className="font-bold text-[18px] text-foreground">{isEdit ? '게더링 수정' : '게더링 추가'}</h2>
          <button onClick={onClose} className="text-tag-text text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {!isEdit && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">게더링 유형 *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { value: 'REGULAR', label: '일반', desc: '신청만 받음' },
                    { value: 'RANDOM_TABLE', label: '우연한 식탁', desc: '자동매칭' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGatheringType(opt.value)}
                      className={`flex flex-col items-start px-4 py-3 rounded-input border text-left transition-colors ${
                        gatheringType === opt.value
                          ? 'border-primary bg-primary-light'
                          : 'border-tag-bg bg-card'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${gatheringType === opt.value ? 'text-primary' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-tag-text mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                {gatheringType === 'RANDOM_TABLE' && (
                  <p className="text-xs text-tag-text mt-1.5">
                    생성 후 신청폼에서 매칭 질문(나이·성별·관심사 등)을 추가하면 자동매칭을 사용할 수 있어요.
                  </p>
                )}
              </div>
            )}

            <Input
              label="게더링명 *"
              placeholder="게더링 이름을 입력해주세요"
              error={errors.title?.message}
              {...register('title')}
            />

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">게더링 소개 *</label>
              <textarea
                className="w-full h-[100px] px-4 py-3 border border-tag-bg rounded-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="게더링에 대해 소개해주세요"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">진행 방식 (줄바꿈으로 구분)</label>
              <textarea
                className="w-full h-[80px] px-4 py-3 border border-tag-bg rounded-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={'1단계 내용\n2단계 내용'}
                {...register('howToRunText')}
              />
            </div>

            <div>
              <Input
                label="기본 참가비 (원) *"
                type="number"
                min={0}
                error={errors.basePrice?.message}
                {...register('basePrice', { valueAsNumber: true })}
              />
              <p className="text-xs text-tag-text mt-1">회차에 가격을 따로 정하면 그 회차는 회차 가격을 써요.</p>
            </div>

            {/* 썸네일 — 상세 상단(aspect-[390/260] = 3:2)에 맞춘다.
                카드(16:9)와 정사각 목록에서는 object-cover로 중앙만 잘려 보인다. */}
            <div className="max-w-[280px]">
              <ImageUploadField
                label="썸네일"
                previewUrl={thumbnailPreviewUrl}
                cropRatio="3:2"
                cropContext="gathering"
                onConfirm={handleThumbnailConfirm}
                onClear={thumbnailTempPath ? handleThumbnailRevert : undefined}
                isUploading={isUploading}
                aspectClassName="aspect-[3/2]"
              />
            </div>

            {/* 상세 사진 — 상세 상단 슬라이더에서 썸네일 다음으로 넘겨 본다. (KAN-372) */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                상세 사진 ({detailImages.length}/{MAX_DETAIL_IMAGES})
              </p>
              {detailImages.length > 0 && (
                <ul className="flex flex-col gap-2 mb-2">
                  {detailImages.map((image, index) => (
                    <li key={image.value} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 임시 업로드 미리보기 URL */}
                      <img src={image.previewUrl} alt={`상세 사진 ${index + 1}`} className="w-16 aspect-[3/2] rounded-lg object-cover bg-tag-bg" />
                      <span className="flex-1 text-xs text-tag-text">{index + 1}번째</span>
                      <button
                        type="button"
                        onClick={() => moveDetailImage(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-tag-text disabled:opacity-30"
                        aria-label="위로 이동"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDetailImage(index, 1)}
                        disabled={index === detailImages.length - 1}
                        className="p-1.5 text-tag-text disabled:opacity-30"
                        aria-label="아래로 이동"
                      >
                        <ChevronDown size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDetailImage(index)}
                        className="p-1.5 text-tag-text hover:text-red-500"
                        aria-label="삭제"
                      >
                        <X size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {detailImages.length < MAX_DETAIL_IMAGES && (
                <label className={`inline-flex items-center px-4 py-2 border border-dashed border-tag-bg rounded-input text-sm text-foreground ${isUploading || (isEdit && !detail) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={isUploading || (isEdit && !detail)}
                    onChange={handleDetailImagesSelect}
                  />
                  {isUploading ? '업로드 중...' : '+ 사진 추가'}
                </label>
              )}
              {imageNotice && <p className="text-xs text-red-500 mt-1">{imageNotice}</p>}
            </div>

            <Input
              label="태그 (쉼표 구분)"
              placeholder="조용한,감성적인"
              {...register('tagsText')}
            />

            {/* 입금 계좌 — 비우면 기본 계좌로 안내된다. (KAN-391) */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">입금 계좌 (선택)</p>
              <Input label="은행" placeholder="우리은행" error={errors.accountBank?.message} {...register('accountBank')} />
              <Input label="계좌번호" placeholder="1002-000-000000" error={errors.accountNumber?.message} {...register('accountNumber')} />
              <Input label="예금주" placeholder="와썹하우스" error={errors.accountHolder?.message} {...register('accountHolder')} />
              <p className="text-xs text-tag-text">계좌번호를 비우면 기본 계좌로 안내돼요.</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isCurated}
                onChange={(e) => setCuratedChoice(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              홈 큐레이션에 노출
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-tag-bg">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">취소</Button>
          <Button
            variant="primary"
            type="button"
            isLoading={isPending}
            disabled={isUploading}
            onClick={handleSubmit(onSubmit)}
            className="flex-1"
          >
            {isUploading ? '업로드 중...' : '저장하기'}
          </Button>
        </div>
      </div>
    </>
  )
}
