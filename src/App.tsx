import { useState } from 'react'
import { ChordInput } from './components/ChordInput/ChordInput.tsx'
import { SegmentedToggle } from './components/SegmentedToggle/SegmentedToggle.tsx'
import { HelpDialog } from './components/HelpDialog/HelpDialog.tsx'
import { PlaybackControls } from './components/PlaybackControls/PlaybackControls.tsx'
import { SequenceStrip } from './components/SequenceStrip/SequenceStrip.tsx'
import { ToneClock, type CircleOrder } from './components/ToneClock/ToneClock.tsx'
import {
  DEGREE_NAMES,
  ROMAN_NAMES,
  keyNames,
  noteNames,
  relativeNames,
  type Accidentals,
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
import {
  clearSequence,
  currentTones,
  insertStep,
  removeStep,
  replaceStep,
  selectStep,
  singleStep,
  type Sequence,
} from './music/sequence.ts'
import { useStoredState } from './useStoredState.ts'
import { useTheme, type ThemeSetting } from './useTheme.ts'
import { formatUrlState } from './urlState.ts'
import { BEATS_RANGE, TEMPO_RANGE, stepDuration, usePlayback } from './usePlayback.ts'
import { useUrlState } from './useUrlState.ts'
import { useWindowKeys } from './useWindowKeys.ts'
import './App.css'

const C_MAJOR = fromPitchClasses([0, 4, 7])

const HOME_URL = 'https://bzamecnik.github.io/tone-clock/'
const REPOSITORY_URL = 'https://github.com/bzamecnik/tone-clock'

type Labels = 'notes' | 'degrees'

/**
 * The chord sequence stored as its steps (12-bit masks) and the current
 * step: "145,529;1". A single step is just its mask, as stored before there
 * were sequences.
 */
function parseSequence(stored: string): Sequence | undefined {
  const match = /^(\d+(?:,\d+)*)(?:;(\d+))?$/.exec(stored)
  const steps = match ? match[1].split(',').map(Number) : []
  const current = Number(match?.[2] ?? 0)
  return match && steps.every((tones) => tones <= 0xfff) && current < steps.length
    ? { steps, current }
    : undefined
}

function serializeSequence({ steps, current }: Sequence): string {
  return steps.length === 1 ? String(steps[0]) : `${steps.join(',')};${current}`
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

const ACCIDENTALS: Accidentals[] = ['key', 'flats', 'sharps']

function parseAccidentals(stored: string): Accidentals | undefined {
  return ACCIDENTALS.find((accidentals) => accidentals === stored)
}

type SequenceView = 'hidden' | 'shown'

function parseSequenceView(stored: string): SequenceView | undefined {
  return stored === 'hidden' || stored === 'shown' ? stored : undefined
}

/** A whole number within the range, or undefined. */
function parseIntegerIn({ min, max }: { min: number; max: number }) {
  return (stored: string): number | undefined => {
    const number = Number(stored)
    return /^\d+$/.test(stored) && number >= min && number <= max ? number : undefined
  }
}

const parseTempo = parseIntegerIn(TEMPO_RANGE)
const parseBeats = parseIntegerIn(BEATS_RANGE)

/** Short description of a step: its chord or scale name, else its notes, or N.C. (no chord). */
function stepName(tones: PitchClassSet, names: PitchClassNames): string {
  const { chord, scale } = nameSet(tones, names)
  return chord || scale || toPitchClasses(tones).map((pc) => names[pc]).join(' ') || 'N.C.'
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

/** Keys editing the sequence while it is shown. */
const SEQUENCE_KEYS: Record<string, (sequence: Sequence) => Sequence> = {
  '+': (sequence) => insertStep(sequence),
  '=': (sequence) => insertStep(sequence),
  '-': removeStep,
  ',': (sequence) => selectStep(sequence, sequence.current - 1),
  '.': (sequence) => selectStep(sequence, sequence.current + 1),
  Home: (sequence) => selectStep(sequence, 0),
}

function App() {
  const [sequence, setSequence] = useStoredState(
    'tone-clock:tones',
    singleStep(C_MAJOR),
    parseSequence,
    serializeSequence,
  )
  const [playing, setPlaying] = useState(false)
  const [tempo, setTempo] = useStoredState('tone-clock:tempo', 120, parseTempo)
  const [beats, setBeats] = useStoredState('tone-clock:beats', 4, parseBeats)
  usePlayback(
    playing,
    stepDuration(tempo, beats),
    () => setSequence((sequence) => selectStep(sequence, sequence.current + 1)),
    sequence.current,
  )
  // the clock shows and edits the current step; editing pauses the playback
  const tones = currentTones(sequence)
  const setTones = (tones: PitchClassSet) => {
    setPlaying(false)
    setSequence((sequence) => replaceStep(sequence, tones))
  }
  const [key, setKey] = useStoredState('tone-clock:key', null, parseKey, serializeKey)
  const [labels, setLabels] = useStoredState<Labels>('tone-clock:labels', 'notes', parseLabels)
  const [accidentals, setAccidentals] = useStoredState<Accidentals>(
    'tone-clock:accidentals',
    'key',
    parseAccidentals,
  )
  const [order, setOrder] = useStoredState<CircleOrder>('tone-clock:order', 'semitones', parseOrder)
  const [colors, setColors] = useStoredState<Colors>('tone-clock:colors', 'key', parseColors)
  const [theme, setTheme] = useStoredState<ThemeSetting>('tone-clock:theme', 'auto', parseTheme)
  const [sequenceView, setSequenceView] = useStoredState<SequenceView>(
    'tone-clock:sequence',
    'hidden',
    parseSequenceView,
  )
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
    } else if (event.key === 'a' || event.key === 'A') {
      setAccidentals(ACCIDENTALS[(ACCIDENTALS.indexOf(accidentals) + 1) % ACCIDENTALS.length])
    } else if (event.key === 'f' || event.key === 'F') {
      setOrder(order === 'semitones' ? 'fifths' : 'semitones')
    } else if (event.key === 'c' || event.key === 'C') {
      setColors(colors === 'key' ? 'plain' : 'key')
    } else if (event.key === 't' || event.key === 'T') {
      setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])
    } else if (event.key === 's' || event.key === 'S') {
      setSequenceView(sequenceView === 'hidden' ? 'shown' : 'hidden')
    } else if (sequenceView === 'shown' && event.key === ' ') {
      event.preventDefault()
      setPlaying(!playing)
    } else if (sequenceView === 'shown') {
      const edit = SEQUENCE_KEYS[event.key]
      if (edit) {
        event.preventDefault()
        setSequence(edit)
      }
    }
  })

  const names = noteNames(accidentals, key)
  const tonicNames = keyNames(accidentals)
  const { chord, scale } = nameSet(tones, names)
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
  const beadNames = degreeNames && labels === 'degrees' ? degreeNames : names
  const secondaryBeadNames = degreeNames && (labels === 'degrees' ? names : degreeNames)
  const romanNames = key === null ? null : relativeNames(ROMAN_NAMES, key)
  const steps = sequence.steps.map((step) => ({
    name: stepName(step, names),
    relative: (romanNames && nameSet(step, romanNames).chord) || undefined,
  }))

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
    <main className={sequenceView === 'shown' ? 'app app--sequence' : 'app'}>
      <h1 className="app__title">
        <a href={HOME_URL}>Tone Clock</a>
      </h1>
      <div className="app__top">
        <ChordInput
          onSubmit={setTones}
          onSubmitSequence={(steps) => {
            setSequence({ steps, current: 0 })
            setSequenceView('shown')
          }}
          tonic={key ?? undefined}
          windowKeys={!showHelp}
        />
        <div className="app__names">
          <output className="app__chord" aria-label="Chord name">
            {chord}
          </output>
          {/* always present (maybe empty), so that the layout does not jump */}
          <span className="app__relative">
            <output aria-label="Relative chord name">{relativeChord}</output>
            {key !== null && relativeChord && ` in ${tonicNames[key]}`}
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
          keyNames={tonicNames}
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
              <td key={pc}>{names[pc]}</td>
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
          label="Accidentals"
          shortcut="A"
          value={accidentals}
          options={[
            { value: 'key', label: 'Key' },
            { value: 'flats', label: 'Flats' },
            { value: 'sharps', label: 'Sharps' },
          ]}
          onChange={setAccidentals}
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
          label="Sequence"
          shortcut="S"
          value={sequenceView}
          options={[
            { value: 'hidden', label: 'Hidden' },
            { value: 'shown', label: 'Shown' },
          ]}
          onChange={setSequenceView}
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
      {sequenceView === 'shown' && (
        <div className="app__sequence">
          <PlaybackControls
            playing={playing}
            onPlayingChange={setPlaying}
            tempo={tempo}
            onTempoChange={setTempo}
            beats={beats}
            onBeatsChange={setBeats}
          />
          <SequenceStrip
            steps={steps}
            current={sequence.current}
            onSelect={(index) => setSequence(selectStep(sequence, index))}
            onAdd={() => setSequence(insertStep(sequence))}
            onRemove={() => setSequence(removeStep(sequence))}
            onClear={() => setSequence(clearSequence(sequence))}
          />
        </div>
      )}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </main>
  )
}

export default App
