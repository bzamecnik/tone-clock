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
- [ ] Vite + React + TypeScript app
- [ ] Vitest + Testing Library (jsdom), `npm test`
- [ ] Minimal demo `App`

### 2. Pitch class set model (`src/music`)
- [ ] `fromPitchClasses`, `toPitchClasses`, `has`, `toggle`, `add`,
      `remove`, `cardinality`
- [ ] `transpose` (rotation mod 12)
- [ ] pitch class labels (flat by default)

### 3. Basic layout (static)
- [ ] `geometry.ts`: bead centers / radius for 12 positions
- [ ] `ToneCircle` renders 12 labelled beads in an SVG circle, C on top,
      clockwise
- [ ] active beads drawn in the active color

### 4. Interactivity
- [ ] click a bead toggles it (controlled + uncontrolled modes, `onChange`)
- [ ] keyboard: Tab between beads, Enter/Space toggles
- [ ] transposition: buttons / ←→ keys rotate the set by one semitone
      (desktop replacement for the two-finger rotation gesture)
- [ ] demo app shows the selected pitch classes, persists the set in
      `localStorage` (default C major triad)

### 5. Extras
- [ ] curved polygon ("chord path") between active beads
- [ ] canonic form + root (`getCanonic` / `getRoot`)
- [ ] pitch class set naming from `chord_names.json`, shown as a title
- [ ] drag & drop of beads (move tone, drag off to clear)
- [ ] rotation by dragging around the circle (mouse) / two-finger gesture
      (touch), snapping to semitones
- [ ] alternative label sets (sharp, Roman numerals, intervals)
- [ ] publish the component as a reusable package

### 6. Desktop app
- [ ] Tauri v2 shell around the React app (`src-tauri/`)
- [ ] macOS build, app icon from the original
- [ ] native persistence / menu (e.g. copy set as text)
