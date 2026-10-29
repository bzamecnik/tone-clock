/**
 * Chord and scale names, ported from harmoneye-commons
 * `res/raw/chord_names.json`.
 *
 * Keyed by the canonic set (see `canonic()`). In `name`, `X` is replaced by
 * the name of the root; `root` is the root pitch class relative to the
 * canonic set, e.g. canonic {0, 3, 5, 8} is a minor seventh chord on 5.
 */
export interface NameTemplate {
  name: string
  root: number
}

export const CHORD_TEMPLATES: Readonly<Record<number, NameTemplate>> = {
  17: { name: 'X-5', root: 0 },
  33: { name: 'X-3', root: 5 },
  69: { name: 'X7-5', root: 2 },
  145: { name: 'X', root: 0 },
  137: { name: 'Xm', root: 0 },
  291: { name: 'XM7', root: 1 },
  329: { name: 'X7', root: 8 },
  73: { name: 'Xmb5', root: 0 },
  81: { name: 'X(b5)', root: 0 },
  325: { name: 'X7b5', root: 2 },
  585: { name: 'Xdim', root: 0 },
  273: { name: 'Xaug', root: 0 },
  293: { name: 'Xm7b5', root: 2 },
  297: { name: 'Xm7', root: 5 },
  275: { name: 'XmM7', root: 1 },
  133: { name: 'X2', root: 0 },
  165: { name: 'X2,4', root: 0 },
  597: { name: 'X9', root: 2 },
  425: { name: 'Xm9', root: 5 },
  589: { name: 'X7b9', root: 2 },
  361: { name: 'Xm7b9', root: 5 },
  613: { name: 'X7#9', root: 2 },
  725: { name: 'X11', root: 2 },
  693: { name: 'Xm11', root: 2 },
  1387: { name: 'X13', root: 8 },
  661: { name: 'X6,9', root: 0 },
  // also X9sus4 without the fifth on the 2nd: C(add2) = D9sus4-5
  149: { name: 'X(add2)', root: 0 },
  299: { name: 'XM9', root: 1 },
}

export const SCALE_TEMPLATES: Readonly<Record<number, NameTemplate>> = {
  273: { name: 'X symmetric 3-tone', root: 0 },
  585: { name: 'X symmetric 4-tone', root: 0 },
  1387: { name: 'X diatonic (major)', root: 1 },
  1371: { name: 'X melodic minor', root: 1 },
  859: { name: 'X harmonic minor', root: 1 },
  875: { name: 'X harmonic major', root: 1 },
  871: { name: 'X double harmonic major', root: 1 },
  1365: { name: 'X symmetric hexatonic', root: 0 },
  1755: { name: 'X symmetric octatonic', root: 0 },
  597: { name: 'pentatonic, complement to X melodic minor', root: 8 },
  // originally "pentatonic, complement to X diatonic" with root 6
  661: { name: 'X major pentatonic', root: 0 },
  1367: { name: 'X major locrian', root: 8 },
}
