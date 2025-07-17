'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function Header() {
  const pathname = usePathname()
  const isToolsPage = pathname.startsWith('/plots') || pathname.startsWith('/defillama')

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
          <Button variant={isToolsPage ? "default" : "ghost"} asChild>
            <Link href="/plots">Tools</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}