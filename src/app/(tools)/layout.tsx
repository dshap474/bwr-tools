'use client'

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Tool Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}