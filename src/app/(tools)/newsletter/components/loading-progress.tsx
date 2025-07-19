'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface LoadingStep {
  name: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  progress: number
}

interface LoadingProgressProps {
  steps: LoadingStep[]
  currentStep: string
  overallProgress: number
  isVisible: boolean
}

export default function LoadingProgress({ steps, currentStep, overallProgress, isVisible }: LoadingProgressProps) {
  if (!isVisible) return null

  const getStepIcon = (status: LoadingStep['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'loading':
        return '🔄'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStepColor = (status: LoadingStep['status']) => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground'
      case 'loading':
        return 'text-blue-600'
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="animate-spin">🔄</span>
          <span>Loading Newsletter Data</span>
        </CardTitle>
        <CardDescription>
          Caching data for all views and time periods...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Current Step */}
        <div className="text-sm text-blue-600 font-medium">
          Currently: {currentStep}
        </div>

        {/* Individual Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-lg">{getStepIcon(step.status)}</span>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className={getStepColor(step.status)}>{step.name}</span>
                  <span className="text-muted-foreground">{step.progress}%</span>
                </div>
                <Progress 
                  value={step.progress} 
                  className="h-1 mt-1" 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Cache Info */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          💾 Data will be cached for faster subsequent loads
        </div>
      </CardContent>
    </Card>
  )
} 