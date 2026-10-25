import { useEffect, useState } from 'react'

/** Theme chosen by the user; "auto" follows the system preference. */
export type ThemeSetting = 'auto' | 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

/**
 * Applies the theme as `data-theme="light|dark"` on the document element,
 * resolving "auto" by the system preference (and following its changes), so
 * that the CSS only needs to know the two concrete themes.
 */
export function useTheme(setting: ThemeSetting) {
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia(DARK_QUERY)
    const update = () => setSystemDark(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const theme = setting === 'auto' ? (systemDark ? 'dark' : 'light') : setting
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
}
