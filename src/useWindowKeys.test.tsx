import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useWindowKeys } from './useWindowKeys.ts'

function Listener({ onKey, enabled }: { onKey: (key: string) => void; enabled?: boolean }) {
  useWindowKeys((event) => onKey(event.key), enabled)
  return <input aria-label="Text" />
}

describe('useWindowKeys', () => {
  it('reports keys pressed anywhere on the page', async () => {
    const user = userEvent.setup()
    const onKey = vi.fn()
    render(<Listener onKey={onKey} />)
    await user.keyboard('l')
    expect(onKey).toHaveBeenCalledWith('l')
  })

  it('ignores keys typed into form fields and shortcuts with modifiers', async () => {
    const user = userEvent.setup()
    const onKey = vi.fn()
    render(<Listener onKey={onKey} />)
    await user.keyboard('{Meta>}l{/Meta}')
    await user.click(screen.getByRole('textbox'))
    await user.keyboard('l')
    expect(onKey).not.toHaveBeenCalled()
  })

  it('does nothing when disabled', async () => {
    const user = userEvent.setup()
    const onKey = vi.fn()
    render(<Listener onKey={onKey} enabled={false} />)
    await user.keyboard('l')
    expect(onKey).not.toHaveBeenCalled()
  })
})
