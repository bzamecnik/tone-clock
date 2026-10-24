import { ToneCircle } from './components/ToneCircle/ToneCircle.tsx'
import { fromPitchClasses } from './music/pitchClassSet.ts'
import './App.css'

const C_MAJOR = fromPitchClasses([0, 4, 7])

function App() {
  return (
    <main className="app">
      <h1>Tone Circle</h1>
      <div className="app__circle">
        <ToneCircle value={C_MAJOR} />
      </div>
    </main>
  )
}

export default App
