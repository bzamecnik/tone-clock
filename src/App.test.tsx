import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { fromPitchClasses } from './music/pitchClassSet.ts'

const STORAGE_KEY = 'tone-clock:tones'

function chordName() {
  return screen.getByLabelText('Chord name').textContent
}

function scaleName() {
  return screen.getByLabelText('Scale name').textContent
}

/** Cells of a row of the table of selected tones, joined by spaces. */
function toneRow(name: string) {
  const row = within(screen.getByRole('table', { name: 'Selected tones' })).getByRole('row', { name })
  return within(row)
    .queryAllByRole('cell')
    .map((cell) => cell.textContent)
    .join(' ')
}

function selectedTones() {
  return toneRow('Notes')
}

function chordDegrees() {
  return toneRow('Degrees in the chord')
}

function keyDegrees() {
  return toneRow('Degrees in the key')
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    history.replaceState(null, '', location.pathname)
  })

  it('shows the app title, linking to the home page', () => {
    render(<App />)
    const title = screen.getByRole('heading', { name: 'Tone Clock' })
    expect(within(title).getByRole('link')).toHaveAttribute('href', 'https://bzamecnik.github.io/tone-clock/')
  })

  it('links to the source code', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/bzamecnik/tone-clock',
    )
  })

  it('lists the tones from the root of the chord, with their degrees', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(chordDegrees()).toBe('1 3 5')
    await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), 'Am7{Enter}')
    expect(selectedTones()).toBe('A C E G')
    expect(chordDegrees()).toBe('1 b3 5 b7')
    expect(screen.queryByRole('row', { name: 'Degrees in the key' })).toBeNull()
  })

  it('outlines the root of the chord on the circle', async () => {
    const user = userEvent.setup()
    render(<App />)
    const root = () => document.querySelector('.tone-clock__bead--root')
    expect(root()).toHaveAttribute('aria-label', 'C')
    await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), 'Am7{Enter}')
    expect(root()).toHaveAttribute('aria-label', 'A')
    await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), '{Backspace}{Backspace}{Backspace}C chromatic{Enter}')
    expect(root()).toBeNull()
  })

  describe('help dialog', () => {
    const dialog = () => screen.queryByRole('dialog', { name: 'Controls' })

    it('opens and closes with the ? key', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(dialog()).toBeNull()
      await user.keyboard('?')
      expect(dialog()).toBeInTheDocument()
      await user.keyboard('?')
      expect(dialog()).toBeNull()
      await user.keyboard('?{Escape}')
      expect(dialog()).toBeNull()
    })

    it('opens from a single hint line, which leaves the explanations to the dialog', async () => {
      const user = userEvent.setup()
      const { container } = render(<App />)
      expect(container.querySelector('.app__hint')).toHaveTextContent(/^Controls\s*\?\s*Copy link\s*GitHub$/)
      await user.click(screen.getByRole('button', { name: 'Controls' }))
      expect(dialog()).toBeInTheDocument()
    })

    it('keeps the other keys from changing the page while open', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.keyboard('?f{ArrowRight}/')
      await user.keyboard('{Escape}')
      expect(selectedTones()).toBe('C E G')
      expect(screen.getByRole('button', { name: 'Semitones' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('textbox', { name: 'Chord, scale or notes' })).not.toHaveFocus()
    })
  })

  describe('theme', () => {
    const theme = () => document.documentElement.dataset.theme

    it('switches between auto, light and dark with the toggle and the T key', async () => {
      const user = userEvent.setup()
      render(<App />)
      const group = within(screen.getByRole('group', { name: 'Theme' }))
      expect(group.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(group.getByRole('button', { name: 'Dark' }))
      expect(theme()).toBe('dark')
      // T cycles auto -> light -> dark -> auto
      await user.keyboard('t')
      expect(group.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
      await user.keyboard('t')
      expect(theme()).toBe('light')
      expect(group.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('remembers the theme', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.click(screen.getByRole('button', { name: 'Dark' }))
      unmount()
      render(<App />)
      expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('key colors', () => {
    const level = (name: string) => screen.getByRole('button', { name }).getAttribute('data-level')

    it('colors the beads by the key, switchable with the C key and the toggle', async () => {
      const user = userEvent.setup()
      render(<App />)
      const group = within(screen.getByRole('group', { name: 'Colors' }))
      expect(group.getByRole('button', { name: 'Key' })).toBeDisabled()
      expect(level('D')).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Key C' }))
      expect(group.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-pressed', 'true')
      expect(level('D')).toBe('3')
      await user.keyboard('c')
      expect(level('D')).toBeNull()
      await user.click(group.getByRole('button', { name: 'Key' }))
      expect(level('D')).toBe('3')
    })

    it('remembers the setting', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.click(screen.getByRole('button', { name: 'Key C' }))
      await user.keyboard('c')
      unmount()
      render(<App />)
      expect(level('D')).toBeNull()
    })
  })

  describe('accidentals', () => {
    const input = () => screen.getByRole('textbox', { name: 'Chord, scale or notes' })
    const group = () => within(screen.getByRole('group', { name: 'Accidentals' }))
    const relativeChord = () => screen.getByLabelText('Relative chord name').parentElement?.textContent

    it('spells the notes by the key, as in C without a key', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(group().getByRole('button', { name: 'Key' })).toHaveAttribute('aria-pressed', 'true')
      await user.type(input(), 'C chromatic{Enter}')
      expect(selectedTones()).toBe('C C# D Eb E F F# G Ab A Bb B')

      await user.click(screen.getByRole('button', { name: 'Key D' }))
      await user.type(input(), 'Bm7{Enter}')
      expect(selectedTones()).toBe('B D F# A')
      expect(chordName()).toBe('Bm7')
      expect(screen.getByRole('button', { name: 'C#' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Key F#' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Key Eb' }))
      await user.type(input(), 'V7{Enter}')
      expect(selectedTones()).toBe('Bb D F Ab')
      expect(relativeChord()).toBe('V7 in Eb')
    })

    it('switches to all flats and all sharps with the A key and the toggle', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Key D' }))
      await user.type(input(), 'F#m{Enter}')
      await user.keyboard('a')
      expect(group().getByRole('button', { name: 'Flats' })).toHaveAttribute('aria-pressed', 'true')
      expect(selectedTones()).toBe('Gb A Db')
      expect(chordName()).toBe('Gbm')
      expect(screen.getByRole('button', { name: 'Key Gb' })).toBeInTheDocument()
      await user.keyboard('A')
      expect(selectedTones()).toBe('F# A C#')
      await user.keyboard('a')
      expect(group().getByRole('button', { name: 'Key' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(group().getByRole('button', { name: 'Sharps' }))
      expect(screen.getByRole('button', { name: 'A#' })).toBeInTheDocument()
    })

    it('remembers the setting', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.keyboard('a')
      unmount()
      render(<App />)
      expect(group().getByRole('button', { name: 'Flats' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('circle of fifths', () => {
    const beadNames = () =>
      within(screen.getByRole('group', { name: 'Tone clock' }))
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('data-pitch-class'))
        .map((b) => b.getAttribute('aria-label'))

    it('switches between semitones and fifths with the F key', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(beadNames().slice(0, 3)).toEqual(['C', 'C#', 'D'])
      await user.keyboard('f')
      expect(beadNames().slice(0, 3)).toEqual(['C', 'G', 'D'])
      // one step is a fifth now
      await user.keyboard('{ArrowRight}')
      expect(selectedTones()).toBe('G B D')
      await user.keyboard('F')
      expect(beadNames().slice(0, 3)).toEqual(['C', 'C#', 'D'])
    })

    it('switches with the toggle buttons too', async () => {
      const user = userEvent.setup()
      render(<App />)
      const group = within(screen.getByRole('group', { name: 'Circle order' }))
      expect(group.getByRole('button', { name: 'Semitones' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(group.getByRole('button', { name: 'Fifths' }))
      expect(beadNames().slice(0, 3)).toEqual(['C', 'G', 'D'])
      expect(group.getByRole('button', { name: 'Fifths' })).toHaveAttribute('aria-pressed', 'true')
      expect(group.getByRole('button', { name: 'Semitones' })).toHaveAttribute('aria-pressed', 'false')
      // the f key still works after clicking a toggle button
      await user.keyboard('f')
      expect(beadNames().slice(0, 3)).toEqual(['C', 'C#', 'D'])
    })

    it('remembers the order', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await user.keyboard('f')
      unmount()
      render(<App />)
      expect(beadNames().slice(0, 3)).toEqual(['C', 'G', 'D'])
    })
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

  it('has no toolbar buttons', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Transpose/ })).toBeNull()
  })

  it('transposes and clears with keys without focusing the circle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{ArrowRight}')
    expect(selectedTones()).toBe('C# F Ab')
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

  it('remembers a chord sequence and its current step', () => {
    localStorage.setItem(STORAGE_KEY, `${fromPitchClasses([0, 4, 7])},${fromPitchClasses([9, 0, 4])};1`)
    render(<App />)
    expect(selectedTones()).toBe('A C E')
  })

  it('falls back to the default for invalid stored data', () => {
    for (const garbage of ['garbage', '4096', '145,529;2']) {
      localStorage.setItem(STORAGE_KEY, garbage)
      const { unmount } = render(<App />)
      expect(selectedTones()).toBe('C E G')
      unmount()
    }
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

  it('keeps the rows of the tone table in place, unlabeled while empty', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const labels = () => [...container.querySelectorAll('.app__tones th')].map((th) => th.textContent)
    expect(labels()).toEqual(['', 'chord', ''])
    await user.click(screen.getByRole('button', { name: 'Key C' }))
    expect(labels()).toEqual(['', 'chord', 'key'])
    await user.keyboard('{Delete}')
    expect(labels()).toEqual(['', '', ''])
    // the empty rows are left out of the accessibility tree
    expect(screen.queryByRole('row', { name: 'Degrees in the key' })).toBeNull()
  })

  describe('key', () => {
    /** Clicks the key marker (toggles the key) */
    function selectKey(user: ReturnType<typeof userEvent.setup>, key: string) {
      return user.click(screen.getByRole('button', { name: `Key ${key}` }))
    }

    function selectedKey() {
      return screen
        .getAllByRole('button', { name: /^Key / })
        .find((m) => m.getAttribute('aria-pressed') === 'true')
        ?.getAttribute('aria-label')
    }

    it('has no key by default', () => {
      render(<App />)
      expect(selectedKey()).toBeUndefined()
      // kept empty, so that the layout does not jump when a key is selected
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent(/^$/)
    })

    it('marks the tonic and names the chord with a Roman numeral', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'A')
      expect(selectedKey()).toBe('Key A')
      // C major in A (minor) is bIII
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('bIII')

      // spelled A# (#1) in A
      await user.click(screen.getByRole('button', { name: 'A#' }))
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('bIII7')
    })

    it('changes the key with the up/down arrows', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.keyboard('{ArrowUp}')
      expect(selectedKey()).toBe('Key C')
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(selectedKey()).toBe('Key Bb')
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('II')
      expect(selectedTones()).toBe('C E G')
    })

    it('has no key dropdown', () => {
      render(<App />)
      expect(screen.queryByRole('combobox', { name: 'Key' })).toBeNull()
    })

    it('lists the selected tones as degrees in the key, from the chord root', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'C')
      expect(keyDegrees()).toBe('1 3 5')
      await selectKey(user, 'A')
      expect(selectedTones()).toBe('C E G')
      expect(chordDegrees()).toBe('1 3 5')
      expect(keyDegrees()).toBe('b3 5 b7')

      await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), 'Em7{Enter}')
      expect(selectedTones()).toBe('E G B D')
      expect(chordDegrees()).toBe('1 b3 5 b7')
      expect(keyDegrees()).toBe('5 b7 2 4')
    })

    it('lists sets without a chord name from the tonic', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'E')
      await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), 'C chromatic{Enter}')
      expect(selectedTones()).toBe('E F F# G G# A A# B C C# D D#')
      expect(screen.queryByRole('row', { name: 'Degrees in the chord' })).toBeNull()
      expect(keyDegrees()).toBe('1 b2 2 b3 3 4 b5 5 b6 6 b7 7')
    })

    it('swaps note names and degrees on the beads with the L key', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(screen.queryByRole('combobox', { name: 'Labels' })).toBeNull()

      await selectKey(user, 'A')
      // note names first, degrees as secondary labels
      expect(screen.getByRole('button', { name: 'A' })).toHaveTextContent('A1')
      await user.keyboard('l')
      expect(screen.getByRole('button', { name: '1' })).toHaveTextContent('1A')
      expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: 'b3' })).toHaveAttribute('aria-pressed', 'true')
      await user.keyboard('L')
      expect(screen.getByRole('button', { name: 'A' })).toHaveTextContent('A1')
      await user.keyboard('l')

      // without a key, beads fall back to note names
      await selectKey(user, 'A')
      expect(screen.getByRole('button', { name: 'C' })).toHaveTextContent(/^C$/)
    })

    it('swaps the labels with the toggle buttons, enabled with a key', async () => {
      const user = userEvent.setup()
      render(<App />)
      const group = within(screen.getByRole('group', { name: 'Labels' }))
      expect(group.getByRole('button', { name: 'Degrees' })).toBeDisabled()
      await selectKey(user, 'A')
      expect(group.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(group.getByRole('button', { name: 'Degrees' }))
      expect(screen.getByRole('button', { name: '1' })).toHaveTextContent('1A')
      expect(group.getByRole('button', { name: 'Degrees' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not swap the labels when typing an L into the chord field', async () => {
      const user = userEvent.setup()
      render(<App />)
      await selectKey(user, 'A')
      await user.type(screen.getByRole('textbox', { name: 'Chord, scale or notes' }), 'l')
      expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    })

    it('remembers the key and labels', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<App />)
      await selectKey(user, 'D')
      await user.keyboard('l')
      unmount()

      render(<App />)
      expect(selectedKey()).toBe('Key D')
      expect(screen.getByRole('button', { name: '1' })).toHaveTextContent('1D')
    })
  })

  describe('link', () => {
    it('keeps the tones and key in the URL fragment', async () => {
      const user = userEvent.setup()
      render(<App />)
      expect(location.hash).toBe('#tones=0,4,7')
      await user.click(screen.getByRole('button', { name: 'Bb' }))
      expect(location.hash).toBe('#tones=0,4,7,10')
      await user.click(screen.getByRole('button', { name: 'Key F' }))
      expect(location.hash).toBe('#tones=0,4,7,10&key=5')
      await user.keyboard('{Delete}')
      expect(location.hash).toBe('#key=5')
      await user.click(screen.getByRole('button', { name: 'Key F' }))
      expect(location.hash).toBe('')
      expect(location.href).not.toContain('#')
    })

    it('opens the tones and key of a link rather than the stored ones', () => {
      localStorage.setItem(STORAGE_KEY, String(fromPitchClasses([0, 3, 7])))
      history.replaceState(null, '', '#tones=g,b,d,f&key=C')
      render(<App />)
      expect(selectedTones()).toBe('G B D F')
      expect(screen.getByLabelText('Relative chord name')).toHaveTextContent('V7')
      // written back in the canonical form
      expect(location.hash).toBe('#tones=7,11,2,5&key=0')
    })

    it('ignores an invalid fragment', () => {
      history.replaceState(null, '', '#tones=X')
      render(<App />)
      expect(selectedTones()).toBe('C E G')
      expect(location.hash).toBe('#tones=0,4,7')
    })

    it('follows a link opened in the same tab', () => {
      render(<App />)
      act(() => {
        history.replaceState(null, '', '#tones=A,C,E')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      expect(chordName()).toBe('Am')
    })

    it('copies the link with a button', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Copy link' }))
      expect(await navigator.clipboard.readText()).toBe(location.href)
      expect(location.href).toMatch(/#tones=0,4,7$/)
      expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument()
    })
  })

  describe('typing a chord', () => {
    const input = () => screen.getByRole('textbox', { name: 'Chord, scale or notes' })

    it('sets the tones from a chord name', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), 'Am7{Enter}')
      expect(selectedTones()).toBe('A C E G')
      expect(chordName()).toBe('Am7')
    })

    it('sets the tones from a scale or a list of notes', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(input(), 'D dorian{Enter}')
      // named as G13, listed from G
      expect(selectedTones()).toBe('G A B C D E F')
      await user.clear(input())
      await user.type(input(), 'Db F Ab B{Enter}')
      // spelled as in C without a key
      expect(chordName()).toBe('C#7')
    })

    it('understands Roman numerals and degrees in the selected key', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Key F' }))
      await user.type(input(), 'V7{Enter}')
      expect(chordName()).toBe('C7')
      await user.clear(input())
      await user.type(input(), '1 b3 5{Enter}')
      expect(chordName()).toBe('Fm')
    })

    it('is focused with the / key and gives the keys back to the page after Enter', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.keyboard('/Am{Enter}')
      expect(chordName()).toBe('Am')
      await user.keyboard('{ArrowRight}')
      expect(chordName()).toBe('Bbm')
      // Escape cancels the typed chord
      await user.keyboard('/G7{Escape}{ArrowRight}')
      expect(chordName()).toBe('Bm')
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
