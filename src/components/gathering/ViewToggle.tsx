import { useTranslations } from 'next-intl'

type View = 'calendar' | 'card'

interface ViewToggleProps {
  view: View
  onChange: (view: View) => void
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const t = useTranslations('gathering.list')

  return (
    <div className="relative grid grid-cols-2 bg-tag-bg rounded-full p-1 mx-4 overflow-hidden">
      <span
        aria-hidden="true"
        className={`absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out ${
          view === 'card' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange('calendar')}
        className={`relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
          view === 'calendar' ? 'text-white' : 'text-tag-text'
        }`}
      >
        {t('calendarView')}
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`relative z-10 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
          view === 'card' ? 'text-white' : 'text-tag-text'
        }`}
      >
        {t('cardView')}
      </button>
    </div>
  )
}
