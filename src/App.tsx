import { ChordInput } from './components/ChordInput/ChordInput.tsx'
import { ToneCircle } from './components/ToneCircle/ToneCircle.tsx'
import {
  DEGREE_NAMES,
  FLAT_NAMES,
  ROMAN_NAMES,
  relativeNames,
  type PitchClassNames,
} from './music/pitchClassNames.ts'
import { nameSet } from './music/pitchClassSetNamer.ts'
import {
  fromPitchClasses,
  toPitchClasses,
  transpose,
  type PitchClassSet,
} from './music/pitchClassSet.ts'
import { useStoredState } from './useStoredState.ts'
import './App.css'

const C_MAJOR = fromPitchClasses([0, 4, 7])

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

function parseLabels(stored: string): Labels | undefined {
  return stored === 'notes' || stored === 'degrees' ? stored : undefined
}

function spell(tones: PitchClassSet, names: PitchClassNames): string {
  return toPitchClasses(tones)
    .map((pc) => names[pc])
    .join(' ')
}

function App() {
  const [tones, setTones] = useStoredState('tone-circle:tones', C_MAJOR, parseTones)
  const [key, setKey] = useStoredState('tone-circle:key', null, parseKey, serializeKey)
  const [labels, setLabels] = useStoredState<Labels>('tone-circle:labels', 'notes', parseLabels)

  const { chord, scale } = nameSet(tones)
  const degreeNames = key === null ? null : relativeNames(DEGREE_NAMES, key)
  // degrees listed from the tonic up
  const degrees = key === null ? '' : spell(transpose(tones, -key), DEGREE_NAMES)
  const relativeChord = key === null ? '' : nameSet(tones, relativeNames(ROMAN_NAMES, key)).chord
  // with a key, beads show both note names and degrees, the chosen one larger
  const beadNames = degreeNames && labels === 'degrees' ? degreeNames : FLAT_NAMES
  const secondaryBeadNames = degreeNames && (labels === 'degrees' ? FLAT_NAMES : degreeNames)

  return (
    <main className="app">
      <h1>Tone Circle</h1>
      <ChordInput onSubmit={setTones} tonic={key ?? undefined} />
      <div className="app__names">
        <output className="app__chord" aria-label="Chord name">
          {chord}
        </output>
        {key !== null && relativeChord && (
          <span className="app__relative">
            <output aria-label="Relative chord name">{relativeChord}</output> in {FLAT_NAMES[key]}
          </span>
        )}
        <output className="app__scale" aria-label="Scale name">
          {scale}
        </output>
      </div>
      <div className="app__circle">
        <ToneCircle
          value={tones}
          onChange={setTones}
          names={beadNames}
          secondaryNames={secondaryBeadNames ?? undefined}
          tonic={key ?? undefined}
          onTonicChange={setKey}
          windowKeys
        />
      </div>
      <output className="app__tones" aria-label="Selected tones">
        {spell(tones, FLAT_NAMES)}
      </output>
      {degreeNames && (
        <output className="app__degrees" aria-label="Selected degrees">
          {degrees}
        </output>
      )}
      <p className="app__hint">
        Click a tone to toggle it, drag it to move it or off the circle to remove it. Drag around the
        circle or press ← → to transpose. Click or drag a triangle, or press ↑ ↓, to choose the key. Delete clears.
      </p>
      <div className="app__settings">
        <label>
          Labels
          <select
            value={labels}
            disabled={key === null}
            onChange={(e) => setLabels(parseLabels(e.target.value) ?? 'notes')}
          >
            <option value="notes">Notes</option>
            <option value="degrees">Degrees</option>
          </select>
        </label>
      </div>
    </main>
  )
}

export default App
