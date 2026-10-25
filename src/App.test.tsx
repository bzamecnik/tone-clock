import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { fromPitchClasses } from './music/pitchClassSet.ts'

const STORAGE_KEY = 'tone-circle:tones'

function chordName() {
  return screen.getByLabelText('Chord name').textContent
}

function scaleName() {
  return screen.getByLabelText('Scale name').textContent
}

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

  it('has no toolbar buttons, but explains the gestures', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Transpose/ })).toBeNull()
    expect(screen.getByText(/drag around/i)).toBeInTheDocument()
  })

  it('transposes and clears with keys without focusing the circle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{ArrowRight}')
    expect(selectedTones()).toBe('Db F Ab')
    await user.keyboard('{Delete}')
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

  it('names the selected chord and scale', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(chordName()).toBe('C')
    expect(scaleName()).toBe('')

    await user.click(screen.getByRole('button', { name: 'Bb' }))
    expect(chordName()).toBe('C7')

    await user.keyboard('{Delete}')
    for (const tone of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      await user.click(screen.getByRole('button', { name: tone }))
    }
    expect(chordName()).toBe('G13')
    expect(scaleName()).toBe('C diatonic (major)')
  })

  describe('key', () => {
    function selectKey(user: ReturnType<typeof userEvent.setup>, key: string) {
      return user.selectOptions(screen.getByRole('combobox', { name: 'Key' }), key)
    }

    it('has no key by default', () => {
      render(<App />)
      expect(screen.getByRole('combobox', { name: 'Key' })).toHaveValue('')
      expect(screen.queryByLabelText('Relative chord name')).toBeNull()
      expect(document.querySelector('.tone-circle__bead--tonic')).toBeNull()
    })

    it('highlights the tonic and names the chord with a Roman numeral', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'A')
      expect(document.querySelector('.tone-circle__bead--tonic')).toHaveAttribute('aria-label', 'A')
      // C major in A (minor) is bIII
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('bIII')

      await user.click(screen.getByRole('button', { name: 'Bb' }))
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('bIII7')
    })

    it('lists the selected tones as scale degrees', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'C')
      expect(screen.getByLabelText('Selected degrees')).toHaveTextContent('1 3 5')
      await selectKey(user, 'A')
      expect(screen.getByLabelText('Selected degrees')).toHaveTextContent('b3 5 b7')
      // listed in ascending order from the tonic
      await selectKey(user, 'D')
      expect(screen.getByLabelText('Selected degrees')).toHaveTextContent('2 4 b7')
    })

    it('can label the beads by scale degrees', async () => {
      const user = userEvent.setup()
      render(<App />)
      const labels = screen.getByRole('combobox', { name: 'Labels' })
      expect(labels).toBeDisabled()

      await selectKey(user, 'A')
      expect(labels).toBeEnabled()
      await user.selectOptions(labels, 'Degrees')
      expect(screen.getByRole('button', { name: '1' })).toHaveClass('tone-circle__bead--tonic')
      expect(screen.getByRole('button', { name: 'b3' })).toHaveAttribute('aria-pressed', 'true')

      // without a key, beads fall back to note names
      await selectKey(user, 'None')
      expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument()
    })

    it('remembers the key and labels', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await selectKey(user, 'D')
      await user.selectOptions(screen.getByRole('combobox', { name: 'Labels' }), 'Degrees')
      unmount()

      render(<App />)
      expect(screen.getByRole('combobox', { name: 'Key' })).toHaveValue('2')
      expect(screen.getByRole('combobox', { name: 'Labels' })).toHaveValue('degrees')
    })
  })

  describe('typing a chord', () => {
    const input = () => screen.getByRole('textbox', { name: 'Chord, scale or notes' })

    it('sets the tones from a chord name', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), 'Am7{Enter}')
      expect(selectedTones()).toBe('C E G A')
      expect(chordName()).toBe('Am7')
    })

    it('sets the tones from a scale or a list of notes', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), 'D dorian{Enter}')
      expect(selectedTones()).toBe('C D E F G A B')
      await user.clear(input())
      await user.type(input(), 'Db F Ab B{Enter}')
      expect(chordName()).toBe('Db7')
    })

    it('understands Roman numerals and degrees in the selected key', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.selectOptions(screen.getByRole('combobox', { name: 'Key' }), 'F')
      await user.type(input(), 'V7{Enter}')
      expect(chordName()).toBe('C7')
      await user.clear(input())
      await user.type(input(), '1 b3 5{Enter}')
      expect(chordName()).toBe('Fm')
    })

    it('clears the tones on empty input', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), '{Enter}')
      expect(selectedTones()).toBe('')
    })

    it('reports input it does not understand and keeps the tones', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), 'Cxyz{Enter}')
      expect(screen.getByRole('alert')).toHaveTextContent('Unknown chord')
      expect(input()).toHaveAttribute('aria-invalid', 'true')
      expect(selectedTones()).toBe('C E G')

      await user.type(input(), '{Backspace}')
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
})
