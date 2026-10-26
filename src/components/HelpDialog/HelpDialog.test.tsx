import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HelpDialog } from './HelpDialog.tsx'

const dialog = () => screen.getByRole('dialog', { name: 'Controls' })

describe('HelpDialog', () => {
  it('opens as a modal dialog explaining the mouse and touch controls', () => {
    render(<HelpDialog onClose={() => {}} />)
    const mouse = screen.getByRole('table', { name: 'Mouse and touch' })
    expect(mouse).toHaveTextContent(/drag around the circle\s*transpose/i)
    expect(mouse).toHaveTextContent(/click or drag a triangle\s*select the key/i)
  })

  it('lists the keyboard shortcuts', () => {
    render(<HelpDialog onClose={() => {}} />)
    expect(dialog()).toHaveAttribute('open')
    const keys = [...screen.getByRole('table', { name: 'Keyboard' }).querySelectorAll('kbd')].map((k) => k.textContent)
    expect(keys).toEqual(expect.arrayContaining(['/', 'Esc', 'Delete', '←', '→', '↑', '↓', 'F', 'L', 'C', 'T', '?']))
  })

  it('closes with the close button, Escape or a click outside', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<HelpDialog onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
    // the backdrop belongs to the dialog element itself, the content does not
    await user.click(screen.getByRole('table', { name: 'Keyboard' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    await user.click(dialog())
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
