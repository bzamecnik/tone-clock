import { Fragment, useEffect, useRef } from 'react'
import './HelpDialog.css'

export interface HelpDialogProps {
  onClose: () => void
}

const GESTURES: [gesture: string, action: string][] = [
  ['click a tone', 'add or remove it'],
  ['drag a tone', 'move it, or off the circle to remove it'],
  ['drag around the circle', 'transpose'],
  ['click or drag a triangle', 'select the key'],
]

const SHORTCUTS: [keys: string[], action: string][] = [
  [['/'], 'type a chord, scale or notes'],
  [['Enter'], 'apply what you typed'],
  [['Esc'], 'cancel typing'],
  [['Delete'], 'clear all tones'],
  [['←', '→'], 'transpose'],
  [['↑', '↓'], 'select the key'],
  [['F'], 'circle order: semitones / fifths'],
  [['L'], 'labels: notes / degrees'],
  [['A'], 'accidentals: key / flats / sharps'],
  [['C'], 'colors: key / plain'],
  [['T'], 'theme: auto / light / dark'],
  [['Tab', 'Space'], 'move to a tone and toggle it'],
  [['?'], 'show or hide this help'],
]

/** Modal explanation of the mouse, touch and keyboard controls, shown while mounted. */
export function HelpDialog({ onClose }: HelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    // as browsers do (not all of them), so that Escape and ? reach the dialog
    closeRef.current?.focus()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="help-dialog"
      aria-labelledby="help-dialog-title"
      // Escape handled here rather than by the browser, which would close
      // the dialog behind React's back
      onCancel={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      // the backdrop is part of the dialog element, the content is not
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="help-dialog__content">
        <h2 id="help-dialog-title">Controls</h2>
        <table aria-labelledby="help-dialog-mouse">
          <caption id="help-dialog-mouse">Mouse and touch</caption>
          <tbody>
            {GESTURES.map(([gesture, action]) => (
              <tr key={gesture}>
                <th scope="row">{gesture}</th>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table aria-labelledby="help-dialog-keyboard">
          <caption id="help-dialog-keyboard">Keyboard</caption>
          <tbody>
            {SHORTCUTS.map(([keys, action]) => (
              <tr key={action}>
                <th scope="row">
                  {keys.map((key, i) => (
                    <Fragment key={key}>
                      {i > 0 && ' '}
                      <kbd>{key}</kbd>
                    </Fragment>
                  ))}
                </th>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button ref={closeRef} type="button" className="help-dialog__close" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
