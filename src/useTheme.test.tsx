import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTheme, type ThemeSetting } from './useTheme.ts'

/** Mocks the system color scheme preference; returns a function to change it. */
function mockSystemDark(dark: boolean) {
  const listeners = new Set<() => void>()
  const query = {
    get matches() {
      return dark
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return (value: boolean) => {
    dark = value
    listeners.forEach((listener) => listener())
  }
}

function Themed({ setting }: { setting: ThemeSetting }) {
  useTheme(setting)
  return null
}

const theme = () => document.documentElement.dataset.theme

describe('useTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.theme
  })

  it('applies an explicit light or dark theme to the document', () => {
    mockSystemDark(true)
    const { rerender } = render(<Themed setting="light" />)
    expect(theme()).toBe('light')
    rerender(<Themed setting="dark" />)
    expect(theme()).toBe('dark')
  })

  it('follows the system preference in auto mode, also when it changes', () => {
    const setSystemDark = mockSystemDark(false)
    render(<Themed setting="auto" />)
    expect(theme()).toBe('light')
    act(() => setSystemDark(true))
    expect(theme()).toBe('dark')
  })

  it('falls back to light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined)
    render(<Themed setting="auto" />)
    expect(theme()).toBe('light')
  })
})
