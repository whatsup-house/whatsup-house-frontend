'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { Images, Pencil, Plus, Trash2, Video } from 'lucide-react'
import { useAdminFeedPosts, useDeleteAdminFeedPost, useSetAdminFeedVisibility } from '@/lib/hooks/useAdminFeed'
import { FeedPostFormPanel } from '@/components/admin/FeedPostFormPanel'
import { LoadingSpinner, Pagination } from '@/components/ui'
import type { AdminFeedPost, FeedMedia } from '@/lib/api/types'

const FILTERS = [
  { label: '전체', value: undefined },
  { label: '노출', value: true },
  { label: '숨김', value: false },
] as const

// 어드민 피드 관리 — 노출 선별·등록·수정 (KAN-383)
export function AdminFeedManager() {
  const [visible, setVisible] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [panel, setPanel] = useState<AdminFeedPost | 'new' | null>(null)

  const { data, isLoading, isError } = useAdminFeedPosts({ visible, page })
  const { mutate: setVisibility, isPending: isToggling, variables: toggling } = useSetAdminFeedVisibility()
  const { mutate: remove } = useDeleteAdminFeedPost()
  const posts = data?.content ?? []

  // 현재 페이지의 마지막 항목이 사라지면(삭제, 필터 중 토글) 앞 페이지로 — 빈 페이지에 남지 않게
  const stepBackIfPageEmpties = () => {
    if (page > 0 && posts.length === 1) setPage(page - 1)
  }

  const handleFilter = (value: boolean | undefined) => {
    setVisible(value)
    setPage(0)
  }

  const handleDelete = (id: string) => {
    if (confirm('이 피드 게시물을 삭제할까요? (복구 불가)')) remove(id, { onSuccess: stepBackIfPageEmpties })
  }

  return (
    <div className="max-w-[1280px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">피드 관리</h1>
          <p className="text-sm text-tag-text mt-1">피드 탭에 노출할 게시물을 등록하고 노출 여부를 고릅니다.</p>
        </div>
        <button
          onClick={() => setPanel('new')}
          className="flex items-center gap-1.5 self-start px-4 h-10 bg-primary text-white rounded-[12px] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          피드 등록
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="노출 필터">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={visible === f.value}
              onClick={() => handleFilter(f.value)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold transition-colors ${
                visible === f.value ? 'bg-primary text-white' : 'bg-tag-bg text-tag-text hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {data && <p className="text-xs text-tag-text">총 {data.totalElements.toLocaleString()}개</p>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : isError ? (
        <div className="flex items-center justify-center h-32 border border-dashed border-red-200 rounded-card text-sm text-red-500">
          피드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center h-32 border border-dashed border-tag-bg rounded-card text-sm text-tag-text">
          게시물이 없습니다. 우측 상단 버튼으로 등록하세요.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {posts.map((post) => {
            // 저장 중에는 누른 값을 먼저 보여주고, 재조회가 끝나면 서버 값으로 맞춘다.
            const isVisible = isToggling && toggling?.id === post.id ? toggling.visible : post.visible
            return (
              <li key={post.id} data-testid="admin-feed-card" className="bg-card rounded-2xl border border-tag-bg/40 overflow-hidden flex flex-col">
                <FeedThumbnail media={post.media[0]} count={post.media.length} />
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="text-[11px] text-tag-text">{dayjs(post.postedAt).format('YYYY.MM.DD HH:mm')}</p>
                  <p className="text-[11px] font-semibold text-tag-text truncate">{post.gathering?.title ?? '연결 게더링 없음'}</p>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2 flex-1">{post.caption || '캡션 없음'}</p>

                  <label className="mt-1 flex items-center justify-between gap-2 text-xs text-foreground">
                    {isVisible ? '노출 중' : '숨김'}
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label="피드 노출"
                      checked={isVisible}
                      disabled={isToggling && toggling?.id === post.id}
                      onChange={() => setVisibility({ id: post.id, visible: !isVisible },
                        visible === undefined ? undefined : { onSuccess: stepBackIfPageEmpties })}
                      className="w-4 h-4 accent-primary"
                    />
                  </label>

                  <div className="mt-1 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPanel(post)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-[11px] rounded-input border border-tag-bg text-tag-text hover:border-foreground transition-colors"
                    >
                      <Pencil size={11} />
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      aria-label="삭제"
                      className="inline-flex items-center justify-center px-2 py-1.5 text-[11px] rounded-input border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {data && data.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
      )}

      {panel !== null && (
        <FeedPostFormPanel
          key={panel === 'new' ? 'new' : panel.id}
          post={panel === 'new' ? null : panel}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}

interface FeedThumbnailProps {
  media: FeedMedia | undefined
  count: number
}

function FeedThumbnail({ media, count }: FeedThumbnailProps) {
  const src = media?.type === 'VIDEO' ? media.posterUrl : media?.url
  return (
    <div className="relative w-full aspect-[4/5] bg-tag-bg flex items-center justify-center text-tag-text">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 외부 미디어 URL 썸네일
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <Video size={28} aria-label="영상" />
      )}
      {media?.type === 'VIDEO' && src && (
        <span className="absolute top-2 left-2 rounded-full bg-black/60 p-1 text-white"><Video size={12} /></span>
      )}
      {count > 1 && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          <Images size={10} />{count}
        </span>
      )}
    </div>
  )
}
