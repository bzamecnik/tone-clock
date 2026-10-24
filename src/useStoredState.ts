import { useEffect, useState } from 'react'

/**
 * Like useState, but persisted in localStorage under `key`. `parse` returns
 * undefined for invalid stored data, in which case `defaultValue` is used.
 */
export function useStoredState<T>(
  key: string,
  defaultValue: T,
  parse: (stored: string) => T | undefined,
  serialize: (value: T) => string = String,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      const parsed = stored === null ? undefined : parse(stored)
      return parsed === undefined ? defaultValue : parsed
    } catch {
      // storage unavailable (e.g. private mode)
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value))
    } catch {
      // storage unavailable (e.g. private mode)
    }
  }, [key, value, serialize])

  return [value, setValue] as const
}
