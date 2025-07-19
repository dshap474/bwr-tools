'use client'

type TimePeriod = 'W' | 'M' | 'Q' | 'Y'
type ViewType = 'chart' | 'asset'

interface PeriodSelectorProps {
  timePeriod: TimePeriod
  viewType: ViewType
  loadingPeriods: Set<TimePeriod>
  onTimePeriodChange: (period: TimePeriod) => void
  onViewTypeChange: (viewType: ViewType) => void
}

export default function PeriodSelector({ 
  timePeriod, 
  viewType, 
  loadingPeriods, 
  onTimePeriodChange, 
  onViewTypeChange 
}: PeriodSelectorProps) {
  return (
    <div className="flex space-x-4">
      {/* Time Period Selector */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {(['W', 'M', 'Q', 'Y'] as TimePeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => onTimePeriodChange(period)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors relative ${
              timePeriod === period 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {period}
            {/* Loading indicator for background loading */}
            {loadingPeriods.has(period) && period !== timePeriod && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            )}
          </button>
        ))}
      </div>
      
      {/* View Type Toggle */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => onViewTypeChange('chart')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            viewType === 'chart' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Chart View
        </button>
        <button
          onClick={() => onViewTypeChange('asset')}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            viewType === 'asset' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Asset View
        </button>
      </div>
    </div>
  )
} 