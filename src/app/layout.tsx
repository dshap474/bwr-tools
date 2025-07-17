import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Header } from '@/components/header/header'

export const metadata: Metadata = {
  title: 'BWR Tools',
  description: 'Advanced plotting and data visualization tools',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground font-sans">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}