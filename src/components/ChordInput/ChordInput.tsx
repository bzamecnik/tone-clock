import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { parseSequence } from '../../music/parseSequence.ts'
import { parseTones } from '../../music/parseTones.ts'
import type { PitchClassSet } from '../../music/pitchClassSet.ts'
import { useWindowKeys } from '../../useWindowKeys.ts'
import './ChordInput.css'

export interface ChordInputProps {
  /** Called with the parsed set when the user submits a valid (or empty) description. */
  onSubmit: (tones: PitchClassSet) => void
  /** Called with the steps of a chord sequence ("C | Am | F | G"); without it, sequences are invalid. */
  onSubmitSequence?: (steps: PitchClassSet[]) => void
  /** Tonic of the current key, enabling Roman numerals and degrees. */
  tonic?: number
  /** Focus the field with the / key pressed anywhere on the page. */
  windowKeys?: boolean
}

/**
 * Text field to set the tones by typing a chord, scale or notes. Like a
 * command line: a valid entry is applied and the field left empty, Escape
 * cancels, so that the keys control the page again.
 */
export function ChordInput({ onSubmit, onSubmitSequence, tonic, windowKeys = false }: ChordInputProps) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useWindowKeys((event) => {
    if (event.key === '/') {
      event.preventDefault()
      inputRef.current?.focus()
    }
  }, windowKeys)

  function leave() {
    setText('')
    setInvalid(false)
    inputRef.current?.blur()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const tones = parseTones(text, tonic ?? null)
    const steps = tones === null && onSubmitSequence ? parseSequence(text, tonic ?? null) : null
    if (tones !== null) {
      onSubmit(tones)
      leave()
    } else if (steps !== null) {
      onSubmitSequence?.(steps)
      leave()
    } else {
      setInvalid(true)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      leave()
    }
  }

  const placeholder = tonic === undefined ? 'e.g. Am7, D dorian, C E G' : 'e.g. Am7, D dorian, V7, 1 b3 5'

  return (
    <form className="chord-input" onSubmit={handleSubmit}>
      <span className="chord-input__field">
        <input
          ref={inputRef}
          type="text"
          aria-label="Chord, scale or notes"
          placeholder={placeholder}
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setText(event.target.value)
            setInvalid(false)
          }}
        />
        {windowKeys && <kbd aria-hidden="true">/</kbd>}
      </span>
      {invalid && (
        <p id={errorId} className="chord-input__error" role="alert">
          Unknown chord, scale or notes
        </p>
      )}
    </form>
  )
}
