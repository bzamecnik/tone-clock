import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SequenceStrip, type SequenceStripProps } from './SequenceStrip.tsx'

const STEPS = [
  { name: 'C', relative: 'I' },
  { name: 'Am', relative: 'VIm' },
  { name: 'F', relative: 'IV' },
  { name: 'G', relative: 'V' },
]

function renderStrip(props: Partial<SequenceStripProps> = {}) {
  const handlers = { onSelect: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn(), onClear: vi.fn() }
  render(<SequenceStrip steps={STEPS} current={1} {...handlers} {...props} />)
  return handlers
}

const steps = () => within(screen.getByRole('list', { name: 'Chord sequence' })).getAllByRole('button')

describe('SequenceStrip', () => {
  it('shows the steps with their chord names and Roman numerals', () => {
    renderStrip()
    expect(steps().map((step) => step.textContent)).toEqual(['CI', 'AmVIm', 'FIV', 'GV'])
    expect(steps()[0]).toHaveAccessibleName('Step 1: C, I')
  })

  it('marks the current step', () => {
    renderStrip()
    expect(steps()[1]).toHaveAttribute('aria-current', 'step')
    expect(steps()[0]).not.toHaveAttribute('aria-current')
  })

  it('names steps without Roman numerals', () => {
    renderStrip({ steps: [{ name: 'C' }, { name: 'N.C.' }] })
    expect(steps()[1]).toHaveAccessibleName('Step 2: N.C.')
  })

  it('selects a step by clicking it', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderStrip()
    await user.click(steps()[2])
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('adds, removes and clears steps with buttons', async () => {
    const user = userEvent.setup()
    const { onAdd, onRemove, onClear } = renderStrip()
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    expect(onAdd).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remove step' }))
    expect(onRemove).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Clear sequence' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('cannot clear a single step', () => {
    renderStrip({ steps: [{ name: 'C' }], current: 0 })
    expect(screen.getByRole('button', { name: 'Clear sequence' })).toBeDisabled()
  })
})
