import { useTranslations } from 'next-intl'

type View = 'calendar' | 'card'

interface ViewToggleProps {
  view: View
  onChange: (view: View) => void
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const t = useTranslations('gathering.list')

  return (
    <div className="flex bg-tag-bg rounded-full p-1 mx-4">
      <button
        onClick={() => onChange('calendar')}
        className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
          view === 'calendar' ? 'bg-primary text-white' : 'text-tag-text'
        }`}
      >
        {t('calendarView')}
      </button>
      <button
        onClick={() => onChange('card')}
        className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
          view === 'card' ? 'bg-primary text-white' : 'text-tag-text'
        }`}
      >
        {t('cardView')}
      </button>
    </div>
  )
}
