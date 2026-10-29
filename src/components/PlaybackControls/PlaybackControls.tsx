import { useState } from 'react'
import './PlaybackControls.css'

export const TEMPO_RANGE = { min: 20, max: 300 }
export const BEATS_RANGE = { min: 1, max: 16 }

export interface PlaybackControlsProps {
  playing: boolean
  onPlayingChange: (playing: boolean) => void
  /** Beats per minute. */
  tempo: number
  onTempoChange: (tempo: number) => void
  /** Length of each step in beats. */
  beats: number
  onBeatsChange: (beats: number) => void
}

/** Play/pause button, tempo and beats per chord of the sequence playback. */
export function PlaybackControls({
  playing,
  onPlayingChange,
  tempo,
  onTempoChange,
  beats,
  onBeatsChange,
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls">
      <button
        type="button"
        className="playback-controls__play"
        aria-label={playing ? 'Pause' : 'Play'}
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
        onClick={() => onPlayingChange(!playing)}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <NumberField label="Tempo (BPM)" unit="BPM" value={tempo} range={TEMPO_RANGE} onChange={onTempoChange} />
      <NumberField
        label="Beats per chord"
        unit="beats"
        value={beats}
        range={BEATS_RANGE}
        onChange={onBeatsChange}
      />
    </div>
  )
}

/**
 * A number input reporting only whole values within the range; while
 * typing, other text stays in the field until it is left.
 */
function NumberField({
  label,
  unit,
  value,
  range,
  onChange,
}: {
  label: string
  unit: string
  value: number
  range: { min: number; max: number }
  onChange: (value: number) => void
}) {
  const [text, setText] = useState<string | null>(null)
  return (
    <label className="playback-controls__field">
      <input
        type="number"
        aria-label={label}
        min={range.min}
        max={range.max}
        value={text ?? value}
        onChange={(event) => {
          const number = Number(event.target.value)
          const valid =
            event.target.value !== '' && Number.isInteger(number) && number >= range.min && number <= range.max
          setText(valid ? null : event.target.value)
          if (valid) {
            onChange(number)
          }
        }}
        onBlur={() => setText(null)}
      />
      <span aria-hidden="true">{unit}</span>
    </label>
  )
}
