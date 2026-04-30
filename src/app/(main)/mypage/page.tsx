'use client'

import { useState } from 'react'
import MyProfile from '@/components/mypage/MyProfile'
import MyApplicationList from '@/components/mypage/MyApplicationList'

const TABS = [
  { key: 'profile', label: '프로필' },
  { key: 'applications', label: '신청 내역' },
] as const

type TabKey = typeof TABS[number]['key']

export default function MyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

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

      {activeTab === 'profile' ? (
        <MyProfile />
      ) : (
        <div className="px-4 py-5">
          <MyApplicationList />
        </div>
      )}
    </div>
  )
}
