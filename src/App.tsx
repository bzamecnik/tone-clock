import { useState } from 'react'
import { ChordInput } from './components/ChordInput/ChordInput.tsx'
import { SegmentedToggle } from './components/SegmentedToggle/SegmentedToggle.tsx'
import { HelpDialog } from './components/HelpDialog/HelpDialog.tsx'
import { ToneClock, type CircleOrder } from './components/ToneClock/ToneClock.tsx'
import {
  DEGREE_NAMES,
  FLAT_NAMES,
  ROMAN_NAMES,
  relativeNames,
  type PitchClassNames,
} from './music/pitchClassNames.ts'
import { chordRoot, nameSet } from './music/pitchClassSetNamer.ts'
import {
  OCTAVE_SIZE,
  fromPitchClasses,
  mod,
  toPitchClasses,
  transpose,
  type PitchClassSet,
} from './music/pitchClassSet.ts'
import { useStoredState } from './useStoredState.ts'
import { useTheme, type ThemeSetting } from './useTheme.ts'
import { formatUrlState } from './urlState.ts'
import { useUrlState } from './useUrlState.ts'
import { useWindowKeys } from './useWindowKeys.ts'
import './App.css'

const C_MAJOR = fromPitchClasses([0, 4, 7])

const HOME_URL = 'https://bzamecnik.github.io/tone-clock/'
const REPOSITORY_URL = 'https://github.com/bzamecnik/tone-clock'

type Labels = 'notes' | 'degrees'

function parseTones(stored: string): PitchClassSet | undefined {
  const tones = Number(stored)
  return /^\d+$/.test(stored) && tones <= 0xfff ? tones : undefined
}

/** Key = tonic pitch class, or null for no key. Stored as "" or "0".."11". */
function parseKey(stored: string): number | null | undefined {
  if (stored === '') {
    return null
  }
  const key = Number(stored)
  return /^\d+$/.test(stored) && key < 12 ? key : undefined
}

function serializeKey(key: number | null): string {
  return key === null ? '' : String(key)
}

function parseOrder(stored: string): CircleOrder | undefined {
  return stored === 'semitones' || stored === 'fifths' ? stored : undefined
}

type Colors = 'plain' | 'key'

const THEMES: ThemeSetting[] = ['auto', 'light', 'dark']

function parseTheme(stored: string): ThemeSetting | undefined {
  return THEMES.find((theme) => theme === stored)
}

function parseColors(stored: string): Colors | undefined {
  return stored === 'plain' || stored === 'key' ? stored : undefined
}

function parseLabels(stored: string): Labels | undefined {
  return stored === 'notes' || stored === 'degrees' ? stored : undefined
}

/** Pitch classes of a set in ascending order from `from` (C by default). */
function ascendingFrom(tones: PitchClassSet, from = 0): number[] {
  return toPitchClasses(transpose(tones, -from)).map((pc) => mod(pc + from, OCTAVE_SIZE))
}

/** A row of degrees of the tones; empty (unlabeled, hidden) without names or tones. */
function DegreeRow({
  label,
  ariaLabel,
  tones,
  names,
}: {
  label: string
  ariaLabel: string
  tones: number[]
  names: PitchClassNames | null
}) {
  const empty = names === null || tones.length === 0
  return (
    <tr className="app__degrees" aria-label={ariaLabel} aria-hidden={empty || undefined}>
      <th scope="row">{empty ? '' : label}</th>
      {!empty && tones.map((pc) => <td key={pc}>{names[pc]}</td>)}
    </tr>
  )
}

function App() {
  const [tones, setTones] = useStoredState('tone-clock:tones', C_MAJOR, parseTones)
  const [key, setKey] = useStoredState('tone-clock:key', null, parseKey, serializeKey)
  const [labels, setLabels] = useStoredState<Labels>('tone-clock:labels', 'notes', parseLabels)
  const [order, setOrder] = useStoredState<CircleOrder>('tone-clock:order', 'semitones', parseOrder)
  const [colors, setColors] = useStoredState<Colors>('tone-clock:colors', 'key', parseColors)
  const [theme, setTheme] = useStoredState<ThemeSetting>('tone-clock:theme', 'auto', parseTheme)
  useTheme(theme)
  const [showHelp, setShowHelp] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useWindowKeys((event) => {
    if (event.key === '?') {
      setShowHelp(!showHelp)
    } else if (showHelp) {
      // the dialog is modal: the other keys wait until it is closed
    } else if (event.key === 'l' || event.key === 'L') {
      setLabels(labels === 'notes' ? 'degrees' : 'notes')
    } else if (event.key === 'f' || event.key === 'F') {
      setOrder(order === 'semitones' ? 'fifths' : 'semitones')
    } else if (event.key === 'c' || event.key === 'C') {
      setColors(colors === 'key' ? 'plain' : 'key')
    } else if (event.key === 't' || event.key === 'T') {
      setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])
    }
  })

  const { chord, scale } = nameSet(tones)
  const degreeNames = key === null ? null : relativeNames(DEGREE_NAMES, key)
  // listed from the root of the chord, else from the tonic (or C)
  const root = chordRoot(tones)
  const toneList = ascendingFrom(tones, root ?? key ?? 0)
  useUrlState(formatUrlState(toneList, key), (state) => {
    setTones(state.tones)
    setKey(state.key)
  })
  const chordDegreeNames = root === null ? null : relativeNames(DEGREE_NAMES, root)
  const relativeChord = key === null ? '' : nameSet(tones, relativeNames(ROMAN_NAMES, key)).chord
  // with a key, beads show both note names and degrees, the chosen one larger
  const beadNames = degreeNames && labels === 'degrees' ? degreeNames : FLAT_NAMES
  const secondaryBeadNames = degreeNames && (labels === 'degrees' ? FLAT_NAMES : degreeNames)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      // clipboard unavailable: the link is still in the address bar
    }
  }

  return (
    <main className="app">
      <h1 className="app__title">
        <a href={HOME_URL}>Tone Clock</a>
      </h1>
      <div className="app__top">
        <ChordInput onSubmit={setTones} tonic={key ?? undefined} windowKeys={!showHelp} />
        <div className="app__names">
          <output className="app__chord" aria-label="Chord name">
            {chord}
          </output>
          {/* always present (maybe empty), so that the layout does not jump */}
          <span className="app__relative">
            <output aria-label="Relative chord name">{relativeChord}</output>
            {key !== null && relativeChord && ` in ${FLAT_NAMES[key]}`}
          </span>
          <output className="app__scale" aria-label="Scale name">
            {scale}
          </output>
        </div>
      </div>
      <div className="app__circle">
        <ToneClock
          value={tones}
          onChange={setTones}
          names={beadNames}
          secondaryNames={secondaryBeadNames ?? undefined}
          root={root ?? undefined}
          order={order}
          keyColors={colors === 'key'}
          tonic={key ?? undefined}
          onTonicChange={setKey}
          windowKeys={!showHelp}
        />
      </div>
      <table className="app__tones" aria-label="Selected tones">
        <tbody>
          <tr aria-label="Notes">
            <th scope="row" />
            {toneList.map((pc) => (
              <td key={pc}>{FLAT_NAMES[pc]}</td>
            ))}
          </tr>
          {/* always present (maybe empty), so that the layout does not jump */}
          <DegreeRow label="chord" ariaLabel="Degrees in the chord" tones={toneList} names={chordDegreeNames} />
          <DegreeRow label="key" ariaLabel="Degrees in the key" tones={toneList} names={degreeNames} />
        </tbody>
      </table>
      <div className="app__settings">
        <SegmentedToggle
          label="Circle order"
          shortcut="F"
          value={order}
          options={[
            { value: 'semitones', label: 'Semitones' },
            { value: 'fifths', label: 'Fifths' },
          ]}
          onChange={setOrder}
        />
        <SegmentedToggle
          label="Labels"
          shortcut="L"
          value={labels}
          options={[
            { value: 'notes', label: 'Notes' },
            { value: 'degrees', label: 'Degrees' },
          ]}
          onChange={setLabels}
          disabled={key === null}
        />
        <SegmentedToggle
          label="Colors"
          shortcut="C"
          value={colors}
          options={[
            { value: 'key', label: 'Key' },
            { value: 'plain', label: 'Plain' },
          ]}
          onChange={setColors}
          disabled={key === null}
        />
        <SegmentedToggle
          label="Theme"
          shortcut="T"
          value={theme}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={setTheme}
        />
      </div>
      {/* the controls are explained in the dialog, the keys also at the toggles */}
      <p className="app__hint">
        <span>
          <button type="button" className="app__link" onClick={() => setShowHelp(true)}>
            Controls
          </button>{' '}
          <kbd aria-hidden="true">?</kbd>
        </span>
        <button type="button" className="app__link" onClick={copyLink}>
          {linkCopied ? 'Link copied' : 'Copy link'}
        </button>
        <a className="app__link" href={REPOSITORY_URL}>
          GitHub
        </a>
      </p>
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </main>
  )
}

export default App
