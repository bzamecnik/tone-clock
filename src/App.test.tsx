import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('shows the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tone Circle' })).toBeInTheDocument()
  })

  it('shows the tone circle with the C major triad', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: 'Tone circle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'E' })).toHaveAttribute('aria-pressed', 'true')
  })
})
