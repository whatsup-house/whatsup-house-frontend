import { getTranslations } from 'next-intl/server'

export default async function SocialPage() {
  const t = await getTranslations('social')

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">{t('title')}</h1>
      <p className="text-tag-text">{t('description')}</p>
    </div>
  )
}
