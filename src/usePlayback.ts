import { useEffect, useRef } from 'react'

export const TEMPO_RANGE = { min: 20, max: 300 }
export const BEATS_RANGE = { min: 1, max: 16 }

/** Duration of a step in milliseconds. */
export function stepDuration(tempo: number, beats: number): number {
  return (beats * 60_000) / tempo
}

/**
 * Calls `onStep` every `stepMs` while `playing`. A change of `restart`
 * (e.g. a step selected by hand) times the current step from its start.
 */
export function usePlayback(playing: boolean, stepMs: number, onStep: () => void, restart?: unknown) {
  // the timer calls the latest handler
  const onStepRef = useRef(onStep)
  useEffect(() => {
    onStepRef.current = onStep
  })

  useEffect(() => {
    if (!playing) {
      return
    }
    const timer = setInterval(() => onStepRef.current(), stepMs)
    return () => clearInterval(timer)
  }, [playing, stepMs, restart])
}
