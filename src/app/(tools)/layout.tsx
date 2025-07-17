'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TOOLS } from '@/lib/constants'

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Tool Selection Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">BWR Tools</h1>
            <p className="text-muted-foreground">Choose your tool and start visualizing data</p>
          </div>
          
          {/* Tool Navigation */}
          <div className="flex gap-3">
            {TOOLS.map((tool) => (
              <Button
                key={tool.path}
                variant={pathname === tool.path ? "default" : "outline"}
                asChild
                className="flex flex-col h-auto p-4 min-w-40 text-center"
              >
                <Link href={tool.path}>
                  <span className="font-semibold text-sm">{tool.name}</span>
                  <span className="text-xs text-muted-foreground mt-1 leading-tight">
                    {tool.description}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}