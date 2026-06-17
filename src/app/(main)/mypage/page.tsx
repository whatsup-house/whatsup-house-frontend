'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import MyProfile from '@/components/mypage/MyProfile'
import MyApplicationList from '@/components/mypage/MyApplicationList'
import MyReviewList from '@/components/mypage/MyReviewList'

const TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'applications', label: '신청 내역' },
  { key: 'reviews', label: '후기' },
] as const

type TabKey = typeof TABS[number]['key']

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value)
}

function MyPageContent() {
  const searchParams = useSearchParams()
  // 쿼리파라미터(tab)로 진입 탭을 결정한다. 잘못된 값이면 프로필로 폴백. (KAN-259)
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabKey>(isTabKey(tabParam) ? tabParam : 'profile')

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-tag-bg/50">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-tag-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'profile' && <MyProfile />}
      {activeTab === 'applications' && (
        <div className="px-4 py-5">
          <MyApplicationList />
        </div>
      )}
      {activeTab === 'reviews' && <MyReviewList />}
    </div>
  )
}

export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyPageContent />
    </Suspense>
  )
}
