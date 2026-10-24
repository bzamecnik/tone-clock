import { useId, useState, type FormEvent } from 'react'
import { parseTones } from '../../music/parseTones.ts'
import type { PitchClassSet } from '../../music/pitchClassSet.ts'
import './ChordInput.css'

export interface ChordInputProps {
  /** Called with the parsed set when the user submits a valid description. */
  onSubmit: (tones: PitchClassSet) => void
  /** Tonic of the current key, enabling Roman numerals and degrees. */
  tonic?: number
}

/** Text field to set the tones by typing a chord, scale or notes. */
export function ChordInput({ onSubmit, tonic }: ChordInputProps) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const tones = parseTones(text, tonic ?? null)
    setInvalid(tones === null)
    if (tones !== null) {
      onSubmit(tones)
    }
  }

  const placeholder = tonic === undefined ? 'e.g. Am7, D dorian, C E G' : 'e.g. Am7, D dorian, V7, 1 b3 5'

  return (
    <form className="chord-input" onSubmit={handleSubmit}>
      <input
        type="text"
        aria-label="Chord, scale or notes"
        placeholder={placeholder}
        value={text}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value)
          setInvalid(false)
        }}
      />
      {invalid && (
        <p id={errorId} className="chord-input__error" role="alert">
          Unknown chord, scale or notes
        </p>
      )}
    </form>
  )
}
