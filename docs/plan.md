# Tone Circle — implementation plan

Goal: re-create the Android *Tone Circle* app as a reusable React component,
then wrap it as a Rust/Tauri desktop app for macOS.

Each step is developed test-first and lands as one or more focused commits.

## Notes from the original Java code

### `PitchClassSet` (harmoneye-commons)

- Immutable value; a pitch class set is a 12-bit integer `index`
  (bit `i` set ⇔ pitch class `i` present; 0 = C). 4096 possible sets.
- Operations: `get`, `set`, `clear`, `flip`, `cardinality`, `asList`.
- `transpose(offset)`: bit rotation within 12 bits:
  `((index << o) | (index >> (12 - o))) & 0xFFF` with `o = offset mod 12`.
- `getCanonic()`: of all 12 transpositions, the one with the minimal index
  (canonic form = prime form up to transposition, not inversion).
  `getRoot()`: the pitch class `r` such that `canonic.transpose(r) == this`.

### `PitchClassNamer`

- Fixed arrays of 12 labels; default "English flat":
  `C Db D Eb E F Gb G Ab A Bb B`. Others: sharp, Roman numerals
  (`I IIb II …`), intervals (`1 b2 2 b3 …`).

### `PitchClassSetNamer` + `chord_names.json`

- JSON maps canonic index → `{ chord: "Xm7", root: 5, scale?: "…" }`.
- Name of a set: look up its canonic index; root name =
  `pitchClassName((template.root + set.root) mod 12)`; replace `X` in the
  chord template with the root name. Unknown sets get an empty name.
- E.g. C major triad {0,4,7} → canonic 145 = {0,4,7}, root 0 → "C".

### `ToneCircleView` (Android)

- Square view. With `R = min(width, height) / 2`:
  bead radius `0.19 R`, circle of bead centers `0.8 R`,
  "apex" radius (polygon vertices) `0.8 R − 0.19 R`.
- Bead `i` at angle `i/12 · 2π − π/2` (clockwise from the top, y down).
- Colors (HSV): inactive bead `(90°, 0.15, 0.9)` ≈ `#d4e6c3`,
  active bead `(90°, 0.5, 0.7)` ≈ `#86b359`; labels white, font size = bead
  radius; white background.
- Interaction:
  - tap on a bead → toggle it;
  - drag an active bead onto another bead → move the tone;
    drag a bead off the circle → clear it;
  - two-finger rotation → transpose by `round(angle / 30°)` semitones.
- "Chord path" (curved polygon) through the apexes of active beads in
  pitch-class order: a quadratic Bézier per edge whose control point is the
  edge midpoint scaled towards the center by `stiffness = 1 − ic / 6`
  (`ic` = interval class 0..6). So a tritone edge bends to the center and a
  semitone edge stays almost straight. 2 tones → stroke only; ≥ 3 tones →
  filled + stroked. Stroke width 5 px, active bead color.
- The app showed the set name as a title above the circle and saved the set
  between sessions (default: C major triad {0,4,7}).

## Architecture

```
src/
  music/
    pitchClassSet.ts       pure functions on 12-bit masks
    pitchClassNames.ts     label sets (flat, sharp, roman, interval)
    pitchClassSetNamer.ts  (extra) chord/scale names
  components/ToneCircle/
    geometry.ts            bead / apex positions, hit testing
    ToneCircle.tsx         SVG rendering + input handling
    chordPath.ts           (extra) curved polygon SVG path
  App.tsx                  demo page
```

- Rendering with **SVG** (declarative, resolution-independent, each bead is a
  DOM element → easy to make accessible and to test). Coordinates in a fixed
  `viewBox="-100 -100 200 200"` so `R = 100`; the component scales via CSS.
- The component supports both **controlled** (`value` + `onChange`) and
  **uncontrolled** (`defaultValue`) use; value = 12-bit mask.
- Each bead is a focusable element with `role="button"`, `aria-pressed` and
  an accessible label (e.g. "Eb"), so it works with keyboard and tests can
  query beads by role/name.

## Roadmap

### 1. Project skeleton
- [x] Vite + React + TypeScript app
- [x] Vitest + Testing Library (jsdom), `npm test`
- [x] Minimal demo `App`

### 2. Pitch class set model (`src/music`)
- [x] `fromPitchClasses`, `toPitchClasses`, `has`, `toggle`, `add`,
      `remove`, `cardinality`
- [x] `transpose` (rotation mod 12)
- [x] pitch class labels (flat by default)

### 3. Basic layout (static)
- [x] `geometry.ts`: bead centers / radius for 12 positions
- [x] `ToneCircle` renders 12 labelled beads in an SVG circle, C on top,
      clockwise
- [x] active beads drawn in the active color

### 4. Interactivity
- [x] click a bead toggles it (controlled + uncontrolled modes, `onChange`)
- [x] keyboard: Tab between beads, Enter/Space toggles
- [x] transposition: buttons / ←→ keys rotate the set by one semitone
      (desktop replacement for the two-finger rotation gesture)
- [x] demo app shows the selected pitch classes, persists the set in
      `localStorage` (default C major triad)

### 5. Features of the original app
- [x] curved polygon ("chord path") between active beads
- [x] canonic form + root (`getCanonic` / `getRoot`)
- [x] pitch class set naming from `chord_names.json`, shown as a title
      (chord name + scale name)
- [x] drag & drop of beads (move a tone, drag off the circle to clear it)
- [x] rotation by dragging around the circle, snapping to semitones
      (mouse and single touch; drag starting off the beads)

### 6. New ideas (beyond the original app)
- [x] select a key (tonic); highlight the tonic bead
- [x] label beads by scale degrees relative to the key
      (`1 b2 2 b3 3 4 b5 5 b6 6 b7 7`), e.g. a minor chord is `1 b3 5`
- [x] relative chord names with Roman numerals (`VIm`, `bVII7`, …)
- [x] reverse input: type a chord name (`Am7`, `F#dim`, `Bb13`), a scale
      (`D dorian`), a list of notes (`C E G`) or, in a key, Roman numerals
      (`V7`) / degrees (`1 b3 5`) to set the active beads
- [x] case-insensitive chord qualities where unambiguous (`CMAJ7`, `cDim`;
      `m7` vs. `M7` and Roman numerals stay case-sensitive)
- [x] submitting empty input clears the tones
- [x] arrow keys work anywhere on the page (except in form fields), not
      only after focusing a bead
- [x] drop the Clear/transpose buttons (empty input, Delete/Backspace,
      dragging and arrow keys replace them); a short hint explains the
      gestures
- [x] ↑ ↓ rotate the key (the tones stay); without a key the first press
      picks the root of the scale or chord name
- [x] key markers: a small triangle outside each bead pointing inwards;
      click an empty one to select the key, the filled one to unselect it
      (replaces the Key dropdown and the tonic ring)
- [x] drag a key marker around the circle to move the key
- [x] with a key, beads show both labels: the chosen kind (notes or
      degrees) large, the other one small below it
- [x] the selected notes and degrees are shown as aligned columns, ordered
      from the chord root (else the tonic, else C), with degrees both in
      the chord and in the key; the names above the circle don't jump with
      the key
- [x] the L key swaps note names and degrees on the beads (replaces the
      Labels dropdown)
- [x] mouse presses don't focus beads/markers (no stray focus ring); a
      focused key marker follows the key when ↑ ↓ move it
- [x] two-column layout on wide screens (circle left as tall as the
      window, panel with input, names, tones and hint right); a small
      title in the corner

Notes:
- Symmetric sets get the lowest root (Db augmented, not A augmented as in
  the original).
- The original JSON stored the diatonic scale name inside the X13 chord
  entry, sharing its root (wrong scale root); chord and scale templates are
  now separate and the commented-out scales are restored.
- As in the original, "Xdim" is the diminished seventh chord and the
  diminished triad is "Xmb5"; the parser follows this (`Cdim` = C Eb Gb A,
  `C°` = C Eb Gb).

### 7. Other extras
- [ ] two-finger rotation gesture on touch screens
- [ ] alternative label sets (sharp) in the UI
- [ ] publish the component as a reusable package

### 8. Desktop app
- [ ] Tauri v2 shell around the React app (`src-tauri/`)
- [ ] macOS build, app icon from the original
- [ ] native persistence / menu (e.g. copy set as text)
