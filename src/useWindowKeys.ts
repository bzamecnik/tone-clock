import { useEffect, useRef } from 'react'

/** Whether a key event belongs to a form field rather than to the page. */
function isFromFormField(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/**
 * Calls `onKeyDown` for keys pressed anywhere on the page while `enabled`,
 * except keys typed into form fields, with modifiers (shortcuts of the
 * browser or OS) or already handled (default prevented).
 */
export function useWindowKeys(onKeyDown: (event: KeyboardEvent) => void, enabled = true) {
  // the listener is attached once and calls the latest handler
  const handlerRef = useRef(onKeyDown)
  useEffect(() => {
    handlerRef.current = onKeyDown
  })
  useEffect(() => {
    if (!enabled) {
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isFromFormField(event)) {
        return
      }
      handlerRef.current(event)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
