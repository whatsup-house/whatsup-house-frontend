interface ChatAvatarProps {
  name: string
  avatarUrl: string | null
  // 문의방의 "와썹하우스" 상대는 로고로 보여준다
  isHouse?: boolean
  size?: 'sm' | 'md'
}

const SIZE_CLASS = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base' }

export default function ChatAvatar({ name, avatarUrl, isHouse = false, size = 'md' }: ChatAvatarProps) {
  const src = isHouse ? '/assets/whatsup-logo.png' : avatarUrl
  const className = `${SIZE_CLASS[size]} shrink-0 rounded-[40%] bg-tag-bg`

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- 프로필·로고 썸네일, 서명 URL 을 이미지 최적화 캐시에 태우지 않는다
    return <img src={src} alt={name} className={`${className} object-cover`} />
  }
  return (
    <div className={`${className} flex items-center justify-center font-bold text-tag-text`} aria-hidden="true">
      {name.slice(0, 1)}
    </div>
  )
}
