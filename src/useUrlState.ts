import { useEffect, useRef } from 'react'
import { parseUrlState, type UrlState } from './urlState.ts'

/**
 * Keeps `hash` (the formatted state) in the URL fragment, without adding
 * history entries, and calls `onLink` with the state of a valid fragment
 * when the page opens and whenever the fragment is changed (a link followed
 * in the same tab).
 */
export function useUrlState(hash: string, onLink: (state: UrlState) => void) {
  // the listener is attached once and calls the latest handler
  const onLinkRef = useRef(onLink)
  useEffect(() => {
    onLinkRef.current = onLink
  })

  useEffect(() => {
    function follow() {
      const state = parseUrlState(location.hash)
      if (state) {
        onLinkRef.current(state)
      }
    }
    follow()
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [])

  // runs after the link is read above; if it changed the state, it runs
  // again with the new hash
  useEffect(() => {
    if (location.hash !== hash) {
      // an empty hash would keep the old fragment: drop it with the path
      history.replaceState(history.state, '', hash || location.pathname + location.search)
    }
  }, [hash])
}
