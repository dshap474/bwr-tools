import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Header } from './header'

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

describe('Header', () => {
  it('renders the BWR Tools title', () => {
    render(<Header />)
    expect(screen.getByText('BWR Tools')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Header />)
    expect(screen.getByText('Plots')).toBeInTheDocument()
    expect(screen.getByText('DeFiLlama')).toBeInTheDocument()
  })

  it('has correct link hrefs', () => {
    render(<Header />)
    expect(screen.getByText('Plots').closest('a')).toHaveAttribute('href', '/plots')
    expect(screen.getByText('DeFiLlama').closest('a')).toHaveAttribute('href', '/defillama')
  })
})