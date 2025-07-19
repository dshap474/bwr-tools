'use client'

import { Button } from '@/components/ui/button'

type TabType = 'indices' | 'dashboards' | 'newsflow'

interface NewsletterHeaderProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function NewsletterHeader({ activeTab, onTabChange }: NewsletterHeaderProps) {
  return (
    <div className="flex items-center justify-start py-2 px-6">
      <div className="flex border rounded-lg">
        <button
          onClick={() => onTabChange('indices')}
          className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
            activeTab === 'indices' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background hover:bg-muted'
          }`}
        >
          Indices
        </button>
        <button
          onClick={() => onTabChange('dashboards')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'dashboards' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background hover:bg-muted'
          }`}
        >
          Dashboards
        </button>
        <button
          onClick={() => onTabChange('newsflow')}
          className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
            activeTab === 'newsflow' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-background hover:bg-muted'
          }`}
        >
          Newsflow
        </button>
      </div>
    </div>
  )
} 