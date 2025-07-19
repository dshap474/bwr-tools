'use client'

import { Card, CardContent } from '@/components/ui/card'

export default function NewsflowPlaceholder() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Newsflow</h2>
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 