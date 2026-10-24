import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { fromPitchClasses } from './music/pitchClassSet.ts'

const STORAGE_KEY = 'tone-circle:tones'

function selectedTones() {
  return screen.getByLabelText('Selected tones').textContent
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the app title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tone Circle' })).toBeInTheDocument()
  })

  it('starts with the C major triad', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'E' })).toHaveAttribute('aria-pressed', 'true')
    expect(selectedTones()).toBe('C E G')
  })

  it('lists the selected tones as the user toggles them', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Bb' }))
    expect(selectedTones()).toBe('C E G Bb')
  })

  it('transposes and clears with buttons', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Transpose up' }))
    expect(selectedTones()).toBe('Db F Ab')
    await user.click(screen.getByRole('button', { name: 'Transpose down' }))
    await user.click(screen.getByRole('button', { name: 'Transpose down' }))
    expect(selectedTones()).toBe('Eb Gb B')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(selectedTones()).toBe('')
  })

  it('remembers the selected tones between sessions', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Bb' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(fromPitchClasses([0, 4, 7, 10])))
    unmount()

    render(<App />)
    expect(selectedTones()).toBe('C E G Bb')
  })

  it('falls back to the default for invalid stored data', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage')
    render(<App />)
    expect(selectedTones()).toBe('C E G')
  })
})
