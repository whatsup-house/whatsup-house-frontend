import { getTranslations } from 'next-intl/server'
import ErrorScreen from '@/components/layout/ErrorScreen'

// 404 — 존재하지 않는 경로 또는 notFound() 호출 시. 앱 셸(헤더/바텀내비) 안에 표시. (KAN-248)
export default async function NotFound() {
  const t = await getTranslations('notFound')

  return (
    <ErrorScreen
      code="404"
      title={t('title')}
      description={t('description')}
      showBack
    />
  )
}
