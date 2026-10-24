import { useEffect, useState } from 'react'
import { ToneCircle } from './components/ToneCircle/ToneCircle.tsx'
import { pitchClassName } from './music/pitchClassNames.ts'
import { nameSet } from './music/pitchClassSetNamer.ts'
import {
  EMPTY,
  fromPitchClasses,
  toPitchClasses,
  transpose,
  type PitchClassSet,
} from './music/pitchClassSet.ts'
import './App.css'

const STORAGE_KEY = 'tone-circle:tones'
const C_MAJOR = fromPitchClasses([0, 4, 7])

function loadTones(): PitchClassSet {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null && /^\d+$/.test(stored)) {
      const tones = Number(stored)
      if (tones <= 0xfff) {
        return tones
      }
    }
  } catch {
    // storage unavailable (e.g. private mode)
  }
  return C_MAJOR
}

function saveTones(tones: PitchClassSet) {
  try {
    localStorage.setItem(STORAGE_KEY, String(tones))
  } catch {
    // storage unavailable (e.g. private mode)
  }
}

function App() {
  const [tones, setTones] = useState(loadTones)

  useEffect(() => saveTones(tones), [tones])

  const { chord, scale } = nameSet(tones)

  return (
    <main className="app">
      <h1>Tone Circle</h1>
      <div className="app__names">
        <output className="app__chord" aria-label="Chord name">
          {chord}
        </output>
        <output className="app__scale" aria-label="Scale name">
          {scale}
        </output>
      </div>
      <div className="app__circle">
        <ToneCircle value={tones} onChange={setTones} />
      </div>
      <output className="app__tones" aria-label="Selected tones">
        {toPitchClasses(tones).map((pc) => pitchClassName(pc)).join(' ')}
      </output>
      <div className="app__toolbar">
        <button type="button" aria-label="Transpose down" onClick={() => setTones(transpose(tones, -1))}>
          ↺
        </button>
        <button type="button" onClick={() => setTones(EMPTY)}>
          Clear
        </button>
        <button type="button" aria-label="Transpose up" onClick={() => setTones(transpose(tones, 1))}>
          ↻
        </button>
      </div>
    </main>
  )
}

export default App
