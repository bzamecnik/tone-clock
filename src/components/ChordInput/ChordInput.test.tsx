import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fromPitchClasses } from '../../music/pitchClassSet.ts'
import { ChordInput } from './ChordInput.tsx'

const input = () => screen.getByRole('textbox', { name: 'Chord, scale or notes' })

describe('ChordInput', () => {
  it('submits the parsed tones, then clears the text and leaves the field', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ChordInput onSubmit={onSubmit} />)
    await user.type(input(), 'Am{Enter}')
    expect(onSubmit).toHaveBeenCalledWith(fromPitchClasses([9, 0, 4]))
    expect(input()).toHaveValue('')
    expect(input()).not.toHaveFocus()
  })

  it('stays in the field on input it does not understand', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ChordInput onSubmit={onSubmit} />)
    await user.type(input(), 'Cxyz{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input()).toHaveValue('Cxyz')
    expect(input()).toHaveFocus()
  })

  it('cancels with Escape: leaves the field without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ChordInput onSubmit={onSubmit} />)
    await user.type(input(), 'Cxyz{Enter}{Escape}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input()).toHaveValue('')
    expect(input()).not.toHaveFocus()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('is focused by the / key pressed anywhere on the page, without typing it', async () => {
    const user = userEvent.setup()
    render(<ChordInput onSubmit={() => {}} windowKeys />)
    await user.keyboard('/')
    expect(input()).toHaveFocus()
    expect(input()).toHaveValue('')
    // inside the field, / is typed as usual
    await user.keyboard('C/E')
    expect(input()).toHaveValue('C/E')
  })

  it('ignores the / key without windowKeys', async () => {
    const user = userEvent.setup()
    render(<ChordInput onSubmit={() => {}} />)
    await user.keyboard('/')
    expect(input()).not.toHaveFocus()
  })

  it('hints the / key inside the field (hidden by CSS while typing)', () => {
    const { container, rerender } = render(<ChordInput onSubmit={() => {}} />)
    expect(container.querySelector('kbd')).toBeNull()
    rerender(<ChordInput onSubmit={() => {}} windowKeys />)
    // right after the input, so that CSS can hide it on focus or with text
    expect(input().nextElementSibling).toHaveTextContent('/')
    expect(input().nextElementSibling?.tagName).toBe('KBD')
  })

  it('submits a sequence of chords separated by bar lines or spaces', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onSubmitSequence = vi.fn()
    render(<ChordInput onSubmit={onSubmit} onSubmitSequence={onSubmitSequence} />)
    await user.type(input(), 'C | Am{Enter}')
    expect(onSubmitSequence).toHaveBeenLastCalledWith([fromPitchClasses([0, 4, 7]), fromPitchClasses([9, 0, 4])])
    expect(input()).toHaveValue('')
    await user.type(input(), 'Dm G7{Enter}')
    expect(onSubmitSequence).toHaveBeenLastCalledWith([fromPitchClasses([2, 5, 9]), fromPitchClasses([7, 11, 2, 5])])
    // a single chord or a list of notes is still one set of tones
    await user.type(input(), 'C E G{Enter}')
    expect(onSubmit).toHaveBeenCalledWith(fromPitchClasses([0, 4, 7]))
    expect(onSubmitSequence).toHaveBeenCalledTimes(2)
  })

  it('rejects a sequence without onSubmitSequence', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ChordInput onSubmit={onSubmit} />)
    await user.type(input(), 'C | Am{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })
})
