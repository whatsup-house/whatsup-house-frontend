'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import dayjs from 'dayjs'
import { ChevronDown, ChevronUp, Video, X } from 'lucide-react'
import type { AdminFeedPost, FeedMedia } from '@/lib/api/types'
import { useSaveAdminFeedPost } from '@/lib/hooks/useAdminFeed'
import { useAdminGatheringTypes } from '@/lib/hooks/useAdminGathering'
import { useUploadImage } from '@/lib/hooks/useUploadImage'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const MAX_MEDIA = 10

const schema = z.object({
  caption: z.string().max(2000, '캡션은 2000자까지 입력할 수 있어요'),
  instagramUrl: z.union([z.literal(''), z.url('올바른 URL 형식을 입력해주세요')]),
  postedAt: z.string().min(1, '게시일시를 입력해주세요'),
  gatheringId: z.string(),
  visible: z.boolean(),
})

type FormValues = z.infer<typeof schema>

// 미디어 한 개 — media.url은 저장 요청에 보낼 값(새 사진은 tempPath, 기존 사진·영상은 URL), previewUrl은 화면 표시용
interface FormMedia {
  media: FeedMedia
  previewUrl: string
}

interface FeedPostFormPanelProps {
  post: AdminFeedPost | null // null이면 새로 등록
  onClose: () => void
}

// 어드민 피드 게시물 등록/수정 패널 (KAN-383)
export function FeedPostFormPanel({ post, onClose }: FeedPostFormPanelProps) {
  const isEdit = !!post
  const [mediaList, setMediaList] = useState<FormMedia[]>(
    () => post?.media.map((m) => ({ media: m, previewUrl: m.type === 'VIDEO' ? m.posterUrl ?? '' : m.url })) ?? [],
  )
  const [mediaNotice, setMediaNotice] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [posterUrl, setPosterUrl] = useState('')
  const [videoFormOpen, setVideoFormOpen] = useState(false)

  const { data: gatherings = [] } = useAdminGatheringTypes()
  const { uploadWithTempPath, isUploading } = useUploadImage('이미지 업로드에 실패했습니다')
  const { mutate: save, isPending } = useSaveAdminFeedPost(onClose)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      caption: post?.caption ?? '',
      instagramUrl: post?.instagramUrl ?? '',
      postedAt: post ? dayjs(post.postedAt).format('YYYY-MM-DDTHH:mm') : '',
      gatheringId: post?.gathering?.id ?? '',
      visible: post?.visible ?? true,
    },
  })

  // 목록에 없는 게더링(삭제 등)이 연결돼 있어도 선택지에 남겨둔다.
  const gatheringOptions = post?.gathering && !gatherings.some((g) => g.id === post.gathering?.id)
    ? [...gatherings, { id: post.gathering.id, title: post.gathering.title }]
    : gatherings

  const handleImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    if (mediaList.length + files.length > MAX_MEDIA) {
      setMediaNotice(`미디어는 최대 ${MAX_MEDIA}개까지 올릴 수 있어요. (지금 ${mediaList.length}개)`)
      return
    }
    setMediaNotice(null)
    let failed = 0
    // 업로드 훅의 isUploading이 하나라 순서대로 올린다. 업로드 중 삭제·이동도 반영되게 함수형으로 붙인다.
    for (const file of files) {
      try {
        const result = await uploadWithTempPath(file, file.name, 'feed')
        setMediaList((prev) => [...prev, { media: { type: 'IMAGE', url: result.tempPath }, previewUrl: result.previewUrl }])
      } catch {
        failed += 1
      }
    }
    if (failed > 0) setMediaNotice(`${failed}장 업로드에 실패했어요. 다시 시도해주세요.`)
  }

  const handleAddVideo = () => {
    if (mediaList.length >= MAX_MEDIA) {
      setMediaNotice(`미디어는 최대 ${MAX_MEDIA}개까지 올릴 수 있어요. (지금 ${mediaList.length}개)`)
      return
    }
    const url = videoUrl.trim()
    const poster = posterUrl.trim()
    if (!/^https?:\/\/\S+$/.test(url) || (poster && !/^https?:\/\/\S+$/.test(poster))) {
      setMediaNotice('영상·포스터 URL은 http(s):// 로 시작해야 해요.')
      return
    }
    setMediaList((prev) => [...prev, { media: { type: 'VIDEO', url, posterUrl: poster || null }, previewUrl: poster }])
    setVideoUrl('')
    setPosterUrl('')
    setVideoFormOpen(false)
    setMediaNotice(null)
  }

  const moveMedia = (index: number, delta: -1 | 1) => {
    const next = [...mediaList]
    ;[next[index], next[index + delta]] = [next[index + delta], next[index]]
    setMediaList(next)
  }

  const removeMedia = (index: number) => {
    setMediaList(mediaList.filter((_, i) => i !== index))
    setMediaNotice(null)
  }

  const onSubmit = (values: FormValues) => {
    if (mediaList.length === 0) {
      setMediaNotice('사진이나 영상을 1개 이상 추가해주세요.')
      return
    }
    save({
      id: post?.id ?? null,
      data: {
        media: mediaList.map((m) => m.media),
        caption: values.caption || undefined,
        instagramUrl: values.instagramUrl || undefined,
        postedAt: dayjs(values.postedAt).format('YYYY-MM-DDTHH:mm:ss'),
        gatheringId: values.gatheringId || null,
        visible: values.visible,
      },
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] h-full bg-card shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-tag-bg">
          <h2 className="font-bold text-[18px] text-foreground">{isEdit ? '피드 수정' : '피드 등록'}</h2>
          <button onClick={onClose} className="min-w-10 min-h-10 inline-flex items-center justify-center text-tag-text hover:text-foreground" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* 미디어 */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                사진·영상 * ({mediaList.length}/{MAX_MEDIA})
              </p>
              {mediaList.length > 0 && (
                <ul className="flex flex-col gap-2 mb-2">
                  {mediaList.map((item, index) => (
                    <li key={`${index}-${item.media.url}`} className="flex items-center gap-3">
                      <div className="relative w-12 aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-tag-bg flex items-center justify-center text-tag-text">
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- 임시 업로드·외부 포스터 미리보기 URL
                          <img src={item.previewUrl} alt={`미디어 ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <Video size={18} />
                        )}
                      </div>
                      <span className="flex-1 min-w-0 text-xs text-tag-text truncate">
                        {index + 1}. {item.media.type === 'VIDEO' ? `영상 · ${item.media.url}` : '사진'}
                      </span>
                      <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0} className="p-1.5 text-tag-text disabled:opacity-30" aria-label="위로 이동">
                        <ChevronUp size={18} />
                      </button>
                      <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === mediaList.length - 1} className="p-1.5 text-tag-text disabled:opacity-30" aria-label="아래로 이동">
                        <ChevronDown size={18} />
                      </button>
                      <button type="button" onClick={() => removeMedia(index)} className="p-1.5 text-tag-text hover:text-red-500" aria-label="삭제">
                        <X size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {mediaList.length < MAX_MEDIA && (
                <div className="flex flex-wrap gap-2">
                  <label className={`inline-flex items-center px-4 py-2 border border-dashed border-tag-bg rounded-input text-sm text-foreground ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                    <input type="file" accept="image/*" multiple className="sr-only" disabled={isUploading} onChange={handleImagesSelect} />
                    {isUploading ? '업로드 중...' : '+ 사진 추가'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setVideoFormOpen((open) => !open)}
                    className="inline-flex items-center px-4 py-2 border border-dashed border-tag-bg rounded-input text-sm text-foreground"
                  >
                    + 영상 URL 추가
                  </button>
                </div>
              )}

              {videoFormOpen && (
                <div className="mt-2 flex flex-col gap-2 rounded-input border border-tag-bg p-3">
                  <p className="text-xs text-tag-text">mp4 공개 URL. R2 직접 업로드는 추후 지원</p>
                  <Input label="영상 URL *" placeholder="https://.../reel.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                  <Input label="포스터 이미지 URL" placeholder="https://.../poster.jpg (선택)" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} />
                  <Button type="button" variant="primary" onClick={handleAddVideo}>영상 추가</Button>
                </div>
              )}
              {mediaNotice && <p className="text-xs text-red-500 mt-1">{mediaNotice}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="feed-caption" className="text-sm font-medium text-foreground">캡션</label>
              <textarea
                id="feed-caption"
                rows={5}
                maxLength={2000}
                placeholder="피드에 표시될 캡션"
                className="w-full px-4 py-3 rounded-input border border-tag-bg bg-card text-foreground placeholder:text-tag-text focus:outline-none focus:ring-2 focus:ring-primary"
                {...register('caption')}
              />
              {errors.caption && <p className="text-xs text-primary">{errors.caption.message}</p>}
            </div>

            <Input label="인스타그램 링크" placeholder="https://www.instagram.com/p/..." error={errors.instagramUrl?.message} {...register('instagramUrl')} />

            <Input label="게시일시" requiredMark type="datetime-local" error={errors.postedAt?.message} {...register('postedAt')} />

            <div>
              <label htmlFor="feed-gathering" className="text-sm font-medium text-foreground block mb-1">연결 게더링</label>
              <select
                id="feed-gathering"
                className="w-full h-[52px] px-4 border border-tag-bg rounded-input text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                {...register('gatheringId')}
              >
                <option value="">없음</option>
                {gatheringOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="w-4 h-4 accent-primary" {...register('visible')} />
              피드에 노출
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-tag-bg">
          <Button variant="ghost" type="button" onClick={onClose} className="flex-1">취소</Button>
          <Button variant="primary" type="button" isLoading={isPending} disabled={isUploading} onClick={handleSubmit(onSubmit)} className="flex-1">
            {isUploading ? '업로드 중...' : '저장하기'}
          </Button>
        </div>
      </div>
    </>
  )
}
