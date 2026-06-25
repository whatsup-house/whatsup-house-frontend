'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MoreVertical, User } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslations } from 'next-intl'
import AppImage from '@/components/ui/AppImage'
import { useToggleReviewLike, useDeleteReview } from '@/lib/hooks/useReview'
import { useAuthStore } from '@/lib/store/authStore'
import type { ReviewItem } from '@/lib/api/types'

interface ReviewCardProps {
  review: ReviewItem
  isLoggedIn: boolean
  showGatheringTitle?: boolean
  onToast: (msg: string) => void
  onDeleted?: () => void
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? 'text-primary' : 'text-tag-text'}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const t = useTranslations('review.card')
  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="w-full max-w-sm bg-card rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 pt-6 pb-5 text-center">
          <p className="text-sm font-bold text-foreground mb-1.5">{t('deleteTitle')}</p>
          <p className="text-xs text-tag-text leading-relaxed">
            {t('deleteDescription')}
          </p>
        </div>
        <div className="flex border-t border-tag-bg/60">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-3.5 text-sm font-semibold text-tag-text border-r border-tag-bg/60 active:bg-tag-bg/40 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-3.5 text-sm font-semibold text-red-500 active:bg-red-50 transition-colors disabled:opacity-50"
          >
            {isPending ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewCard({
  review,
  isLoggedIn,
  showGatheringTitle = false,
  onToast,
  onDeleted,
}: ReviewCardProps) {
  const t = useTranslations('review.card')
  const { userId } = useAuthStore()
  const isMyReview = isLoggedIn && review.userId === userId
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(review.likeCount)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { mutate: toggleLike } = useToggleReviewLike()
  const { mutate: doDelete, isPending: isDeleting } = useDeleteReview(
    review.gatheringId,
    onDeleted,
  )

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleLike = () => {
    if (!isLoggedIn) {
      onToast(t('loginRequired'))
      return
    }
    const prevLiked = liked
    const prevCount = likeCount
    setLiked(!prevLiked)
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1)
    toggleLike(review.reviewId, {
      onSuccess: (data) => {
        setLiked(data.liked)
        setLikeCount(data.likeCount)
      },
      onError: () => {
        setLiked(prevLiked)
        setLikeCount(prevCount)
      },
    })
  }

  const handleDeleteConfirm = () => {
    doDelete(review.reviewId, {
      onSuccess: () => {
        setShowDeleteConfirm(false)
        onToast(t('deleteSuccess'))
      },
      onError: () => {
        setShowDeleteConfirm(false)
        onToast(t('deleteFailed'))
      },
    })
  }

  const authorName = review.nickname ?? t('anonymous')
  const gatheringTitle = review.gatheringTitle ?? t('gatheringFallback')

  return (
    <>
      <div className="bg-card rounded-card border border-tag-bg/40 shadow-sm overflow-hidden mb-3.5">
        {/* 헤더: 아바타, 타입 배지 */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
          <div className="w-9 h-9 rounded-full bg-tag-bg flex items-center justify-center shrink-0">
            <User size={18} className="text-tag-text" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {review.reviewType === 'PHOTO' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0 bg-primary-light text-primary">
                  {t('photoReview')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-tag-text truncate">
              <span>{authorName}</span>
              <span className="mx-1">·</span>
              {t('writtenAt', { date: dayjs(review.createdAt).format('YYYY.MM.DD') })}
            </p>
          </div>
          {isMyReview && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setShowMenu((o) => !o)}
                className="p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                aria-label={t('more')}
              >
                <MoreVertical size={18} className="text-tag-text" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[100px] bg-card rounded-xl border border-tag-bg/50 shadow-lg overflow-hidden">
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-500 active:bg-red-50 transition-colors"
                  >
                    {t('delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 게더링 링크 칩 (전체 후기 모드) */}
        {showGatheringTitle && (
          <div className="mx-4 mb-3">
            <Link
              href={`/gatherings/${review.gatheringId}`}
              className="flex items-center gap-1.5 bg-tag-bg rounded-[10px] px-3 py-2 active:opacity-70 transition-opacity"
            >
              <div className="w-0.5 h-3.5 bg-primary rounded-full shrink-0" />
              <span className="text-xs font-semibold text-foreground truncate">
                {gatheringTitle}
              </span>
            </Link>
          </div>
        )}

        {/* 사진 (PHOTO 타입에 images가 있을 때만) */}
        {review.reviewType === 'PHOTO' && review.images?.[0]?.imageUrl && (
          <div className="px-4 pb-3">
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-card">
              <AppImage
                src={review.images[0].imageUrl}
                alt=""
                className="object-cover"
                sizes="(max-width: 390px) 100vw, 390px"
              />
            </div>
          </div>
        )}

        {/* 본문 */}
        <p className="px-5 pb-3.5 text-sm text-tag-text leading-relaxed">{review.reviewContent}</p>

        {/* 하단: 추천 버튼 */}
        <div className="border-t border-tag-bg/60 px-4 py-2.5">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 min-h-[36px]"
            aria-label={liked ? t('unlike') : t('like')}
          >
            <HeartIcon filled={liked} />
            <span className={`text-sm font-medium ${liked ? 'text-primary' : 'text-tag-text'}`}>
              {likeCount}
            </span>
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={isDeleting}
        />
      )}
    </>
  )
}
