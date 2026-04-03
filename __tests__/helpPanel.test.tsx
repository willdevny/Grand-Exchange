import { render, screen } from '@testing-library/react'
import HelpPanel from '@/components/HelpPanel'

describe('HelpPanel', () => {
  it('renders the help title', () => {
    render(<HelpPanel />)
    expect(screen.getByText('Help Info')).toBeInTheDocument()
  })

  it('renders guidance text for navigation', () => {
    render(<HelpPanel />)
    expect(screen.getByText(/navigate using the top bar/i)).toBeInTheDocument()
  })

  it('mentions the AI stock agent in the description', () => {
    render(<HelpPanel />)
    expect(screen.getByText(/AI stock agent/i)).toBeInTheDocument()
  })
})
