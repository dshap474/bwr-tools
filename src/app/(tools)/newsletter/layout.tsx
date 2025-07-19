import { ReactNode } from 'react'

interface NewsletterLayoutProps {
  children: ReactNode
}

export default function NewsletterLayout({ children }: NewsletterLayoutProps) {
  return (
    <div className="min-h-screen -mt-8">
      {children}
    </div>
  )
} 