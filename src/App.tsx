import { ChordInput } from './components/ChordInput/ChordInput.tsx'
import { SegmentedToggle } from './components/SegmentedToggle/SegmentedToggle.tsx'
import { ToneCircle, type CircleOrder } from './components/ToneCircle/ToneCircle.tsx'
import {
  DEGREE_NAMES,
  FLAT_NAMES,
  ROMAN_NAMES,
  relativeNames,
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
import { useWindowKeys } from './useWindowKeys.ts'
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

function parseOrder(stored: string): CircleOrder | undefined {
  return stored === 'semitones' || stored === 'fifths' ? stored : undefined
}

type Colors = 'plain' | 'key'

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

function App() {
  const [tones, setTones] = useStoredState('tone-circle:tones', C_MAJOR, parseTones)
  const [key, setKey] = useStoredState('tone-circle:key', null, parseKey, serializeKey)
  const [labels, setLabels] = useStoredState<Labels>('tone-circle:labels', 'notes', parseLabels)
  const [order, setOrder] = useStoredState<CircleOrder>('tone-circle:order', 'semitones', parseOrder)
  const [colors, setColors] = useStoredState<Colors>('tone-circle:colors', 'key', parseColors)

  useWindowKeys((event) => {
    if (event.key === 'l' || event.key === 'L') {
      setLabels(labels === 'notes' ? 'degrees' : 'notes')
    } else if (event.key === 'f' || event.key === 'F') {
      setOrder(order === 'semitones' ? 'fifths' : 'semitones')
    } else if (event.key === 'c' || event.key === 'C') {
      setColors(colors === 'key' ? 'plain' : 'key')
    }
  })

  const { chord, scale } = nameSet(tones)
  const degreeNames = key === null ? null : relativeNames(DEGREE_NAMES, key)
  // listed from the root of the chord, else from the tonic (or C)
  const root = chordRoot(tones)
  const toneList = ascendingFrom(tones, root ?? key ?? 0)
  const chordDegreeNames = root === null ? null : relativeNames(DEGREE_NAMES, root)
  const relativeChord = key === null ? '' : nameSet(tones, relativeNames(ROMAN_NAMES, key)).chord
  // with a key, beads show both note names and degrees, the chosen one larger
  const beadNames = degreeNames && labels === 'degrees' ? degreeNames : FLAT_NAMES
  const secondaryBeadNames = degreeNames && (labels === 'degrees' ? FLAT_NAMES : degreeNames)

  return (
    <main className="app">
      <h1 className="app__title">Tone Circle</h1>
      <div className="app__top">
        <ChordInput onSubmit={setTones} tonic={key ?? undefined} />
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
        <ToneCircle
          value={tones}
          onChange={setTones}
          names={beadNames}
          secondaryNames={secondaryBeadNames ?? undefined}
          root={root ?? undefined}
          order={order}
          keyColors={colors === 'key'}
          tonic={key ?? undefined}
          onTonicChange={setKey}
          windowKeys
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
          {chordDegreeNames && (
            <tr className="app__degrees" aria-label="Degrees in the chord">
              <th scope="row">chord</th>
              {toneList.map((pc) => (
                <td key={pc}>{chordDegreeNames[pc]}</td>
              ))}
            </tr>
          )}
          {degreeNames && (
            <tr className="app__degrees" aria-label="Degrees in the key">
              <th scope="row">key</th>
              {toneList.map((pc) => (
                <td key={pc}>{degreeNames[pc]}</td>
              ))}
            </tr>
          )}
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
            { value: 'plain', label: 'Plain' },
            { value: 'key', label: 'Key' },
          ]}
          onChange={setColors}
          disabled={key === null}
        />
      </div>
      <ul className="app__hint">
        <li>Click a tone to toggle it, drag it to move it or off the circle to remove it.</li>
        <li>
          Drag around the circle or press <kbd>←</kbd> <kbd>→</kbd> to transpose.
        </li>
        <li>
          Click or drag a triangle, or press <kbd>↑</kbd> <kbd>↓</kbd>, to choose the key.
        </li>
        <li><kbd>L</kbd> swaps note names and degrees.</li>
        <li><kbd>F</kbd> switches to the circle of fifths and back.</li>
        <li><kbd>C</kbd> colors the tones by how close they are to the key.</li>
        <li><kbd>Delete</kbd> clears all tones.</li>
      </ul>
    </main>
  )
}

export default App
