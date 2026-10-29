import { EMPTY, mod, transpose, type PitchClassSet } from './pitchClassSet.ts'

/**
 * A chord sequence: steps of equal length played in a loop, and the current
 * step, which the clock shows and edits. A single step is a plain chord.
 * There is always at least one step.
 */
export interface Sequence {
  readonly steps: readonly PitchClassSet[]
  readonly current: number
}

export function singleStep(tones: PitchClassSet): Sequence {
  return { steps: [tones], current: 0 }
}

export function currentTones(sequence: Sequence): PitchClassSet {
  return sequence.steps[sequence.current]
}

export function replaceStep(sequence: Sequence, tones: PitchClassSet): Sequence {
  const steps = [...sequence.steps]
  steps[sequence.current] = tones
  return { steps, current: sequence.current }
}

/** Inserts a step after the current one (a copy of it by default) and selects it. */
export function insertStep(sequence: Sequence, tones = currentTones(sequence)): Sequence {
  const current = sequence.current + 1
  const steps = [...sequence.steps]
  steps.splice(current, 0, tones)
  return { steps, current }
}

/** Removes the current step and selects the previous one; the last step becomes empty. */
export function removeStep(sequence: Sequence): Sequence {
  if (sequence.steps.length === 1) {
    return singleStep(EMPTY)
  }
  const steps = sequence.steps.filter((_, index) => index !== sequence.current)
  return { steps, current: Math.max(sequence.current - 1, 0) }
}

/** Keeps only the current step. */
export function clearSequence(sequence: Sequence): Sequence {
  return singleStep(currentTones(sequence))
}

export function selectStep(sequence: Sequence, index: number): Sequence {
  return { steps: sequence.steps, current: mod(index, sequence.steps.length) }
}

/** Moves the step at `from` to `to`; the current step stays selected. */
export function moveStep(sequence: Sequence, from: number, to: number): Sequence {
  const steps = [...sequence.steps]
  const [moved] = steps.splice(from, 1)
  steps.splice(to, 0, moved)
  const order = sequence.steps.map((_, index) => index)
  const [movedIndex] = order.splice(from, 1)
  order.splice(to, 0, movedIndex)
  return { steps, current: order.indexOf(sequence.current) }
}

export function transposeSequence(sequence: Sequence, offset: number): Sequence {
  return { steps: sequence.steps.map((tones) => transpose(tones, offset)), current: sequence.current }
}
