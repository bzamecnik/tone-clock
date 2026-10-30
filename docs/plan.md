# Tone Clock — implementation plan

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
  components/ToneClock/
    geometry.ts            bead / apex positions, hit testing
    ToneClock.tsx         SVG rendering + input handling
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
- [x] `ToneClock` renders 12 labelled beads in an SVG circle, C on top,
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
- [x] the root of the chord is outlined on the circle
- [x] circle of fifths: the F key switches the order of the beads between
      semitones and fifths (diatonic scales become arcs of neighbors;
      stacked-third chords only with 11ths and 13ths); one rotation step
      is then a fifth
- [x] key colors: beads colored by how "inside" the key they are (green
      for degree 2 via yellow for the tritone 4-7 to red for b6), in OKLCH
      with equal lightness so that brightness tells active tones; the C key
      or a toggle switches them
- [x] inverse bead labels (dark on inactive beads)
- [x] scale arc: the diatonic scale of the key marked by arcs inside the
      beads
- [x] toggle buttons for the circle order and the labels in the panel,
      showing their keyboard shortcuts
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
- [x] accidentals mode: flats or sharps by the selected key (e.g. F# in D),
      always flats, always sharps; switched by the A key or a toggle
- [ ] spell chords and scales by their root (E G# B in C, not E Ab B)
- [ ] undo / redo of the changes of tones and key
- [ ] auto-complete in the chord input (chord and scale names)
- [ ] alternative chord names when a set has several (e.g. C6 = Am7)
- [ ] publish the component as a reusable package
- [x] dark mode: Auto (follows the system) / Light / Dark, switched by the
      T key or a toggle
- [x] CI (lint, tests, build) and deployment on GitHub Pages
- [x] installable web app (PWA) working offline

### 8. Polish before the release
- [x] `/` focuses the chord input; Enter applies the chord and leaves the
      field empty, Escape cancels; the keys control the page again
- [x] `?` (or the Controls link) shows a dialog explaining the mouse,
      touch and keyboard controls, instead of the hints in the panel
- [x] tones and key in the URL fragment (`#tones=7,11,2,5&key=0`, pitch
      classes; note names of older links are read too), with a button to
      copy the link
- [ ] idea: symbolic URL input like the chord input (`#tones=G7&key=C`)
- [x] the right panel keeps its layout when there is no chord name or key
- [ ] idea: embed mode, a read-only clock for an `<iframe>` on other pages

### 9. Chord sequences and voice leading

Goal: a short loop of chords (a progression) with silent playback. Between
the chords, the active beads move along the circle as voices, so that the
clock shows the voice leading and not only the chords.

#### Design notes

**Model.** A sequence is a list of steps, each a pitch class set (12-bit
mask), plus one current step. All steps have the same length and the
sequence loops. The key stays global: one key for the whole sequence, so each
step also gets its Roman numeral (`I vi IV V`). Pure functions in
`src/music/sequence.ts`: insert, remove, replace, move and transpose steps.

**The clock edits the current step.** Today's app is a sequence of one step,
and everything that changes the tones (beads, dragging, the chord input,
← →) changes the current step. So the existing UI keeps working without a
sequence mode. Extra actions:
- add a step after the current one (a copy of it, so that it can be edited
  into the next chord), delete the current step, clear the sequence;
- select a step by clicking it in the strip or by keys;
- later: reorder steps by dragging, transpose the whole sequence.

**Text input of a whole sequence.** `|` separates the steps, like bar lines
in a lead sheet: `C | Am | F | G`, `Dm7 | G7 | Cmaj7` or, in a key,
`I | vi | IV | V`. Spaces and commas are taken (note lists `C E G`,
`D, F#, A`), so the input first tries the whole text as one set (replacing
the current step) and only then as a sequence: text with `|`, or text whose
words are all valid chords but not a note list (`C Am F G`). Formatting a
sequence back as text gives the copy-paste and URL form.

**Voice leading.** Only pitch classes are known, so the voices are guessed:
match the tones of one chord to the next one so that
1. the voices do not cross (the matching keeps the cyclic order around the
   circle),
2. as few voices as possible: as many as the larger chord has tones (no
   needless doubling, which could otherwise "cheat" on the motion),
3. the total motion is minimal (sum of the semitone distances, L1),
4. ties are broken by a smaller sum of squares (smaller leaps), then
   downwards (e.g. a tritone, or G7 → C with D → C rather than D → E).

For chords of the same size this is a cyclic rotation of the matching: try
each of the *n* rotations, each voice moves by the signed shortest interval
consistent with the others (Tymoczko: minimal voice leadings between sets of
equal size can always be taken crossing-free). For different sizes, voices
split (C → G7: one voice doubles) or merge, found by a cyclic DTW-like
alignment of the two sorted lists (each tone used at least once, monotone
around the circle), minimizing over the starting rotation — tiny sizes, so
brute force over rotations is fine. An empty step makes the voices fade
out/in. The result is a list of voices `{ from, to, motion }` with `motion`
in semitones (−6..6, 0 = a common tone). The loop also connects the last
step back to the first.

Examples for tests: C → Am holds C and E, G → A (+2); C → F holds C,
E → F (+1), G → A (+2); C → Cm: E → Eb (−1); G7 → C: B → C, D → C (merge),
F → E, G holds; C → Caug: G → G#; augmented chords a semitone apart are a
symmetric tie (resolved deterministically).

**Animation.** The `ToneClock` stays controlled: it gets an optional
`transition = { voices, progress }` (0..1) and draws a moving dot per voice
along the circle, while the chord path morphs (its vertices interpolated
along the arcs, a split vertex starting as a double point). At progress 1
the beads of the next chord are active. Geometry needs fractional positions
on the circle (`pointAt(position)`). The voice leading is always computed in
semitones; in the fifths order the voices follow the same motion, only
animated differently: a semitone step is 5 positions apart there, so the dot
skips across the circle (e.g. straight through the inside) instead of
travelling along it. `prefers-reduced-motion` switches the steps without
animation.

**Playback.** Play/pause, previous/next step, first step, loop always on.
Tempo as BPM with a number of beats per chord (e.g. 90 BPM, 4 beats), so
that sound can be added later; the transition takes a short part of the
step (~300 ms, at its start). The timing is a pure function of the elapsed
time (`stepAt(time)`, `transitionProgress(time)`), driven by
`requestAnimationFrame` in a `usePlayback` hook (fake timers in tests).
Editing pauses the playback; clicking a step jumps to it.

**Layout.** The sequence is optional: a Sequence toggle (S) shows a strip
below the clock and the panel, spanning both columns; the clock gets smaller
to make room (its height is the window minus the strip). Without the strip
the app looks as today.

```
+----------------------------+-----------------+
|                            | [chord input  ] |
|          clock             |  Am7  vi7 in C  |
|                            |  tones, toggles |
+----------------------------+-----------------+
| > || |< >|  90 BPM x4   [ C | Am | F | G ] + |
+----------------------------------------------+
```

**Strip representation.** First chord names: a chip per step with the
chord name (and Roman numeral in a key), the current one highlighted, the
playing one marked. Then a piano roll modulo 12 with the chord names as
annotations above the columns: 12 rows by the steps, active cells filled,
the voices drawn as lines between the columns, i.e. a voice-leading diagram.
The rows follow the circle order (semitones or fifths, starting from the
key) and the cells the key colors, like the beads. Another idea: a tiny
clock (just the chord path) per chip, so that the shapes can be compared at
a glance.

**Keys** (free ones; ← → ↑ ↓ and Delete stay for the current step):
Space play/pause, `,` `.` previous/next step, Home first step, `+` add a
step, `-` remove the step (Shift+Delete would also clear the tones through
the clock's Delete key), S show the strip.

**Persistence.** The sequence in `localStorage` and in the URL as pitch
classes, steps separated by `|`: `#seq=0,4,7|9,0,4|5,9,0|7,11,2&key=0`
(a single step stays `#tones=…`).

#### Steps
- [x] sequence model: steps + current step, insert / remove / replace /
      move / transpose (pure, `src/music/sequence.ts`)
- [x] voice leading of chords of the same size: non-crossing, minimal
      motion, deterministic ties (`src/music/voiceLeading.ts`)
- [x] voice leading of different sizes (split / merge voices) and of empty
      steps
- [x] parse a sequence as text (`C | Am | F | G`, `C Am F G`, Roman
      numerals in a key, `N.C.`); the chord input accepts a whole sequence
- [ ] format a sequence as text, e.g. to copy it
- [x] sequence strip with chord chips; the clock edits the current step;
      add, delete, select and clear steps
- [x] optional strip (S toggle), the clock shrinks to make room
- [x] playback: play/pause, previous/next/first step, tempo and beats per
      chord, keyboard shortcuts
- [x] animated transitions: moving voices and a morphing chord path,
      crossfading beads, reduced motion respected
- [x] the sequence in `localStorage` and the URL
- [ ] voice-leading preview on the clock: faint arrows from the current
      chord to the next one
- [ ] piano roll (mod 12) view of the strip with voice lines and chord
      names above, in the circle order and the key colors
- [x] explain minimal, crossing-free voice leading in `docs/music-theory.md`
- [ ] move steps (e.g. by dragging the chips) and transpose the whole
      sequence

Later:
- sound (Web Audio): the voices give real registers, so the voice leading
  becomes an actual voicing (keep the voices in a range as they drift)
- steps of different lengths, key changes within the sequence
- reorder steps by dragging, undo / redo, choosing an alternative voice
  leading by hand for an ambiguous transition
- import of a progression from a lead sheet or MIDI
- keep the chord name typed for a step (a set has one name in the namer:
  D G C E is named C(add2), though typed as D9sus4-5 in a progression)
- better voicings: voice leading with registers (bass, doubled tones),
  researched on real progressions and piano voicings as test data, e.g.
  *Midnight in a Perfect World* (DJ Shadow, after Pekka Pohjola) in Bb:
  `Gm | F(add2) | Ebmaj7 | D9sus4 | Dm11`
  (`VIm | V(add2) | IVM7 | III9sus4 | IIIm11`), voiced
  G D G Bb – F C G A C – Eb Bb G Bb D – D G C E – D A D G C E F

Both ways of entering a sequence are supported (the whole sequence as text,
and step by step with the clock), to see which one works better.

### 10. Desktop app
- [ ] Tauri v2 shell around the React app (`src-tauri/`)
- [ ] macOS build, app icon from the original
- [ ] native persistence / menu (e.g. copy set as text)
