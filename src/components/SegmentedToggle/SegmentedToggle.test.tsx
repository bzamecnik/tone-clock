import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedToggle } from './SegmentedToggle.tsx'

const OPTIONS = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
]

describe('SegmentedToggle', () => {
  it('presses the button of the current value', () => {
    render(<SegmentedToggle label="Fruit" value="b" options={OPTIONS} onChange={() => {}} />)
    const group = within(screen.getByRole('group', { name: 'Fruit' }))
    expect(group.getByRole('button', { name: 'Apple' })).toHaveAttribute('aria-pressed', 'false')
    expect(group.getByRole('button', { name: 'Banana' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports the clicked option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SegmentedToggle label="Fruit" value="b" options={OPTIONS} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Apple' }))
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('can be disabled and shows its keyboard shortcut', () => {
    const { container } = render(
      <SegmentedToggle label="Fruit" value="a" options={OPTIONS} onChange={() => {}} disabled shortcut="X" />,
    )
    expect(screen.getByRole('button', { name: 'Apple' })).toBeDisabled()
    expect(container.querySelector('kbd')).toHaveTextContent('X')
  })
})
