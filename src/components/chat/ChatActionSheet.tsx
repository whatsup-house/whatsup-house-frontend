export interface ChatSheetAction {
  key: string
  label: string
  danger?: boolean
  onSelect: () => void
}

interface ChatActionSheetProps {
  actions: ChatSheetAction[]
  // 있으면 상단에 리액션 이모지 줄을 보여준다
  reactionEmojis?: readonly string[]
  onSelectReaction?: (emoji: string) => void
  onClose: () => void
}

export default function ChatActionSheet({ actions, reactionEmojis, onSelectReaction, onClose }: ChatActionSheetProps) {
  return (
    <div className="fixed lg:absolute inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full md:max-w-[430px] rounded-t-2xl bg-card pb-[max(env(safe-area-inset-bottom),12px)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-tag-bg" />
        </div>
        {reactionEmojis && onSelectReaction && (
          <div className="flex justify-around border-b border-tag-bg px-3 pb-3 pt-1">
            {reactionEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onClose()
                  onSelectReaction(emoji)
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-tag-bg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <ul className="py-1">
          {actions.map((action) => (
            <li key={action.key}>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  action.onSelect()
                }}
                className={`w-full px-5 py-3.5 text-left text-[15px] active:bg-tag-bg ${
                  action.danger ? 'text-primary' : 'text-foreground'
                }`}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
