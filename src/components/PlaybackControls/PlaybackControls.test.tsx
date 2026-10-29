import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlaybackControls, type PlaybackControlsProps } from './PlaybackControls.tsx'

function renderControls(props: Partial<PlaybackControlsProps> = {}) {
  const handlers = { onPlayingChange: vi.fn(), onTempoChange: vi.fn(), onBeatsChange: vi.fn() }
  render(<PlaybackControls playing={false} tempo={120} beats={4} {...handlers} {...props} />)
  return handlers
}

describe('PlaybackControls', () => {
  it('plays and pauses with a button', async () => {
    const user = userEvent.setup()
    const { onPlayingChange } = renderControls()
    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(onPlayingChange).toHaveBeenCalledWith(true)
  })

  it('shows a pause button while playing', async () => {
    const user = userEvent.setup()
    const { onPlayingChange } = renderControls({ playing: true })
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(onPlayingChange).toHaveBeenCalledWith(false)
  })

  it('sets the tempo and the beats per chord', () => {
    const { onTempoChange, onBeatsChange } = renderControls()
    expect(screen.getByRole('spinbutton', { name: 'Tempo (BPM)' })).toHaveValue(120)
    expect(screen.getByRole('spinbutton', { name: 'Beats per chord' })).toHaveValue(4)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Tempo (BPM)' }), { target: { value: '90' } })
    expect(onTempoChange).toHaveBeenCalledWith(90)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Beats per chord' }), { target: { value: '2' } })
    expect(onBeatsChange).toHaveBeenCalledWith(2)
  })

  it('ignores values out of range while typing', () => {
    const { onTempoChange, onBeatsChange } = renderControls()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Tempo (BPM)' }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Tempo (BPM)' }), { target: { value: '5' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Beats per chord' }), { target: { value: '0' } })
    expect(onTempoChange).not.toHaveBeenCalled()
    expect(onBeatsChange).not.toHaveBeenCalled()
  })
})
