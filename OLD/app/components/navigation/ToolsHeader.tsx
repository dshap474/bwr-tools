'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const tools = [
  { name: 'BWR Plots', href: '/plots', id: 'plots' },
  { name: 'DeFiLlama', href: '/defillama', id: 'defillama' },
]

export function ToolsHeader() {
  const pathname = usePathname()
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              BWR Tools
            </Link>
            
            <nav className="ml-10 flex space-x-8">
              {tools.map((tool) => {
                const isActive = pathname.startsWith(`/${tool.id}`)
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2',
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    {tool.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}