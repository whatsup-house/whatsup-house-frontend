import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Button from './Button'

interface ApiErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export default function ApiErrorMessage({ message, onRetry }: ApiErrorMessageProps) {
  const t = useTranslations('ui.apiError')

  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertCircle size={32} className="text-primary" />
      <p className="text-sm text-tag-text">{message ?? t('fallback')}</p>
      {onRetry && (
        <Button variant="outlined" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  )
}
