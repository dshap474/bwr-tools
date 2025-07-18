'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TOOLS } from '@/lib/constants'

export function Header() {
  const pathname = usePathname()
  const isToolsPage = pathname.startsWith('/plots') || pathname.startsWith('/defillama') || pathname.startsWith('/newsletter')

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
          BWR Tools
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant={!isToolsPage ? "default" : "ghost"} asChild>
            <Link href="/">Home</Link>
          </Button>
          
          {/* Tool Selection */}
          {TOOLS.map((tool) => (
            <Button
              key={tool.path}
              variant={pathname === tool.path ? "default" : "ghost"}
              asChild
            >
              <Link href={tool.path}>{tool.name}</Link>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  )
}