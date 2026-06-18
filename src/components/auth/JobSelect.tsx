'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { useJobs } from '@/lib/hooks/useJobs'

interface JobSelectProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
}

// 검색형 직업 선택 콤보박스. 직업군 헤더로 그룹된 세부직업을 검색·선택한다. (KAN-270)
// value/onChange는 직업 "코드"를 다룬다(라벨이 아님). 미선택은 빈 문자열.
export default function JobSelect({ value, onChange, placeholder = '직업을 검색해 선택하세요' }: JobSelectProps) {
  const { data: groups } = useJobs()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = useMemo(() => {
    if (!value || !groups) return ''
    for (const group of groups) {
      const found = group.jobs.find((job) => job.code === value)
      if (found) return found.label
    }
    return value
  }, [value, groups])

  const filtered = useMemo(() => {
    if (!groups) return []
    const keyword = query.trim()
    if (!keyword) return groups
    return groups
      .map((group) => ({ ...group, jobs: group.jobs.filter((job) => job.label.includes(keyword)) }))
      .filter((group) => group.jobs.length > 0)
  }, [groups, query])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-input border border-tag-bg bg-card min-h-[44px] text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-sm ${selectedLabel ? 'text-foreground' : 'text-tag-text'}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="직업 선택 해제"
              onClick={(event) => {
                event.stopPropagation()
                handleSelect('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  handleSelect('')
                }
              }}
              className="text-tag-text flex items-center"
            >
              <X size={16} />
            </span>
          )}
          <ChevronDown size={18} className="text-tag-text" />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-input border border-tag-bg bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-tag-bg">
            <Search size={16} className="text-tag-text" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="직업 검색"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-tag-text focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-tag-text">검색 결과가 없어요</li>
            )}
            {filtered.map((group) => (
              <li key={group.category}>
                <p className="px-4 pt-2 pb-1 text-xs text-tag-text">{group.categoryLabel}</p>
                <ul>
                  {group.jobs.map((job) => (
                    <li key={job.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={value === job.code}
                        onClick={() => handleSelect(job.code)}
                        className={`w-full text-left px-4 py-2.5 text-sm min-h-[44px] ${
                          value === job.code ? 'bg-tag-bg text-foreground font-medium' : 'text-foreground'
                        }`}
                      >
                        {job.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
