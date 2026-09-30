import { Bell, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useChatPushBanner } from '@/lib/hooks/useChatPush'

// /chat 상단 새 메시지 알림 배너. iOS 브라우저 탭에서는 홈 화면 추가 안내로 바뀐다.
export default function ChatPushBanner() {
  const t = useTranslations('chat.push')
  const tCommon = useTranslations('common')
  const { banner, allow, later } = useChatPushBanner()

  if (banner === 'none') return null

  return (
    <div className="flex items-center gap-3 border-b border-tag-bg bg-tag-bg/40 px-4 py-2.5">
      <Bell size={16} className="shrink-0 text-tag-text" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] text-foreground">
        {banner === 'prompt' ? t('prompt') : t('iosGuide')}
      </p>
      {banner === 'prompt' ? (
        <>
          <button type="button" onClick={later} className="shrink-0 px-1 text-[13px] text-tag-text">
            {t('later')}
          </button>
          <button
            type="button"
            onClick={allow}
            className="shrink-0 rounded-full bg-primary px-3 py-1 text-[13px] font-semibold text-white"
          >
            {t('allow')}
          </button>
        </>
      ) : (
        <button type="button" onClick={later} aria-label={tCommon('close')} className="shrink-0 p-1 text-tag-text">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
